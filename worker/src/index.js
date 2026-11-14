import { createAndroidProject } from "./android-generator.js";

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const id = () => crypto.randomUUID();
const encoder = new TextEncoder();
const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmac(value, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}
async function digest(value) {
  return b64(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}
function cookie(request, name) {
  const item = (request.headers.get("Cookie") || "").split(";").map(x => x.trim()).find(x => x.startsWith(name + "="));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}
function cookieHeader(value, maxAge) {
  return `am_session=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
async function createSession(env, userId) {
  const sessionId = id();
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14;
  await env.DB.prepare("INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)").bind(sessionId, userId, expires).run();
  const payload = sessionId + "." + expires;
  return { token: payload + "." + await hmac(payload, env.SESSION_SECRET), maxAge: 60 * 60 * 24 * 14 };
}
async function currentUser(request, env) {
  const token = cookie(request, "am_session");
  const [sid, exp, sig] = token.split(".");
  if (!sid || !exp || !sig || Number(exp) < Math.floor(Date.now() / 1000) || !env.SESSION_SECRET) return null;
  const payload = sid + "." + exp;
  if (await hmac(payload, env.SESSION_SECRET) !== sig) return null;
  const row = await env.DB.prepare("SELECT users.id,users.email,users.display_name FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.id=? AND sessions.expires_at>?").bind(sid, Math.floor(Date.now()/1000)).first();
  return row || null;
}
function originAllowed(request, env) {
  const origin = request.headers.get("Origin");
  return !origin || origin === env.APP_ORIGIN || new URL(request.url).origin === origin;
}
async function requireUser(request, env) {
  const user = await currentUser(request, env);
  return user ? { user } : { response: json({ error: "Authentication required" }, 401) };
}
function randomCode() { return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0"); }
async function sendOtp(request, env) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.SESSION_SECRET) return json({ error: "Email sign-in is not configured on this deployment." }, 503);
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
  const prior = await env.DB.prepare("SELECT created_at FROM email_otps WHERE email=?").bind(email).first();
  if (prior && Math.floor(Date.now()/1000) - prior.created_at < 60) return json({error:"Please wait 60 seconds before requesting another code."},429);
  const code = randomCode(), expires = Math.floor(Date.now()/1000) + 600;
  await env.DB.prepare("INSERT INTO email_otps(email,code_hash,expires_at,attempts,created_at) VALUES(?,?,?,0,?) ON CONFLICT(email) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,created_at=excluded.created_at").bind(email, await digest(email + ":" + code + ":" + env.SESSION_SECRET), expires, Math.floor(Date.now()/1000)).run();
  const mail = await fetch("https://api.resend.com/emails", { method:"POST", headers:{Authorization:"Bearer " + env.RESEND_API_KEY,"Content-Type":"application/json"}, body:JSON.stringify({from:env.EMAIL_FROM,to:[email],subject:"Your AM BUILDSTUDIO sign-in code",text:"Your verification code is " + code + ". It expires in 10 minutes. If you did not request this, ignore this email."}) });
  if (!mail.ok) return json({ error: "Could not send verification email. Check the email provider configuration." }, 502);
  return json({ ok:true, message:"Verification code sent. It expires in 10 minutes." });
}
async function verifyOtp(request, env) {
  const body = await request.json(), email = String(body.email || "").trim().toLowerCase(), code = String(body.code || "").trim();
  if (!email || !/^\d{6}$/.test(code)) return json({error:"Valid email and 6-digit code required."},400);
  const otp = await env.DB.prepare("SELECT * FROM email_otps WHERE email=?").bind(email).first();
  if (!otp || otp.expires_at < Math.floor(Date.now()/1000) || otp.attempts >= 5) return json({error:"Code expired or attempts exceeded. Request a new code."},400);
  const candidate = await digest(email + ":" + code + ":" + env.SESSION_SECRET);
  if (candidate !== otp.code_hash) {
    await env.DB.prepare("UPDATE email_otps SET attempts=attempts+1 WHERE email=?").bind(email).run();
    return json({error:"Incorrect verification code."},400);
  }
  await env.DB.prepare("DELETE FROM email_otps WHERE email=?").bind(email).run();
  const userId = id();
  await env.DB.prepare("INSERT INTO users(id,email,display_name) VALUES(?,?,?) ON CONFLICT(email) DO NOTHING").bind(userId,email,email.split("@")[0]).run();
  const user = await env.DB.prepare("SELECT id,email,display_name FROM users WHERE email=?").bind(email).first();
  const session = await createSession(env,user.id);
  return json({user},200,{ "set-cookie":cookieHeader(session.token,session.maxAge) });
}
async function googleLogin(request, env) {
  if (!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID.startsWith("REPLACE_") || !env.SESSION_SECRET) return json({error:"Google sign-in is not configured."},503);
  const body = await request.json(), credential = String(body.credential || "");
  if (!credential || credential.length > 10000) return json({error:"Google credential required."},400);
  const verify = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(credential));
  if (!verify.ok) return json({error:"Google credential could not be verified."},401);
  const claims = await verify.json();
  if (claims.aud !== env.GOOGLE_CLIENT_ID || !["accounts.google.com","https://accounts.google.com"].includes(claims.iss) || claims.email_verified !== "true" || Number(claims.exp) <= Date.now()/1000) return json({error:"Google credential is invalid for this app."},401);
  const email = String(claims.email || "").toLowerCase();
  const userId = id();
  await env.DB.prepare("INSERT INTO users(id,email,display_name,google_sub) VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET google_sub=excluded.google_sub,display_name=excluded.display_name").bind(userId,email,String(claims.name || ""),String(claims.sub || "")).run();
  const user = await env.DB.prepare("SELECT id,email,display_name FROM users WHERE email=?").bind(email).first();
  const session = await createSession(env,user.id);
  return json({user},200,{"set-cookie":cookieHeader(session.token,session.maxAge)});
}
async function handle(request, env) {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (path === "/api/health" && method === "GET") {
    let db = false;
    try { await env.DB.prepare("SELECT 1").first(); db = true; } catch {}
    return json({ ok:db, service:"am-buildstudio-api", database:db, ai:!!env.AI, authConfigured:!!(env.SESSION_SECRET && env.GOOGLE_CLIENT_ID && env.RESEND_API_KEY) }, db?200:503);
  }
  if (path === "/api/auth/email/request" && method === "POST") return sendOtp(request,env);
  if (path === "/api/auth/email/verify" && method === "POST") return verifyOtp(request,env);
  if (path === "/api/auth/google" && method === "POST") return googleLogin(request,env);
  if (path === "/api/auth/me" && method === "GET") {
    const user = await currentUser(request,env);
    return user ? json({user}) : json({user:null},401);
  }
  if (path === "/api/auth/logout" && method === "POST") {
    const user = await currentUser(request,env), token = cookie(request,"am_session");
    if (user && token) await env.DB.prepare("DELETE FROM sessions WHERE id=?").bind(token.split(".")[0]).run();
    return json({ok:true},200,{"set-cookie":cookieHeader("",0)});
  }
  const auth = await requireUser(request,env);
  if (auth.response) return auth.response;
  if (path === "/api/projects" && method === "GET") {
    const result = await env.DB.prepare("SELECT id,name,kind,description,status,created_at,updated_at FROM projects WHERE user_id=? ORDER BY updated_at DESC LIMIT 100").bind(auth.user.id).all();
    return json({projects:result.results || []});
  }
  if (path === "/api/projects" && method === "POST") {
    const body = await request.json(), name = String(body.name || "").trim(), kind = body.kind === "Game" ? "Game" : "App", description = String(body.description || "").trim();
    if (!name || name.length > 80 || description.length > 5000) return json({error:"Project name (1-80 chars) and description (max 5000 chars) required."},400);
    const projectId = id();
    await env.DB.prepare("INSERT INTO projects(id,user_id,name,kind,description) VALUES(?,?,?,?,?)").bind(projectId,auth.user.id,name,kind,description).run();
    return json({id:projectId,name,kind,description,status:"draft"},201);
  }
  const projectMatch = path.match(/^\/api\/projects\/([\w-]+)$/);
  if (projectMatch && method === "DELETE") {
    const result = await env.DB.prepare("DELETE FROM projects WHERE id=? AND user_id=?").bind(projectMatch[1],auth.user.id).run();
    return result.meta.changes ? json({ok:true}) : json({error:"Project not found."},404);
  }
  const generateMatch = path.match(/^\/api\/projects\/([\w-]+)\/generate$/);
  if (generateMatch && method === "POST") {
    if (!env.AI) return json({error:"Cloudflare Workers AI binding is not configured."},503);
    const project = await env.DB.prepare("SELECT * FROM projects WHERE id=? AND user_id=?").bind(generateMatch[1],auth.user.id).first();
    if (!project) return json({error:"Project not found."},404);
    const aiResult = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {messages:[
      {role:"system",content:"You are AM BUILDSTUDIO. Return a concise JSON object only with keys: appName, kind, summary, features (array of up to 8 strings), screens (array of up to 8 strings). Do not return source code or build scripts."},
      {role:"user",content:"Create a safe project plan for " + project.kind + " named " + project.name + ". Description: " + project.description}
    ],max_tokens:900});
    const raw = aiResult.response || "";
    let plan;
    try { plan = JSON.parse(raw); } catch { return json({error:"AI returned an invalid project plan. Try again."},502); }
    if (!plan || !Array.isArray(plan.features) || !Array.isArray(plan.screens)) return json({error:"AI response did not match the required schema."},502);
    const saved = JSON.stringify(plan);
    await env.DB.prepare("UPDATE projects SET status='generated',generated_files=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?").bind(saved,project.id,auth.user.id).run();
    return json({projectId:project.id,plan});
  }
  const androidMatch = path.match(/^\/api\/projects\/([\w-]+)\/android-project$/);
  if (androidMatch && method === "POST") {
    const project = await env.DB.prepare("SELECT * FROM projects WHERE id=? AND user_id=?").bind(androidMatch[1],auth.user.id).first();
    if (!project) return json({error:"Project not found."},404);
    let generatedPlan = null;
    try { generatedPlan = project.generated_files ? JSON.parse(project.generated_files) : null; } catch {}
    return json({projectId:project.id, ...createAndroidProject({...project, plan:generatedPlan})});
  }
  return json({error:"Not found"},404);
}
export default {
  async fetch(request,env) {
    if (!originAllowed(request,env)) return json({error:"Origin not allowed"},403);
    if (request.method === "OPTIONS") return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":env.APP_ORIGIN || "null","Access-Control-Allow-Methods":"GET,POST,DELETE,OPTIONS","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Credentials":"true","Vary":"Origin"}});
    try {
      const response = await handle(request,env);
      const headers = new Headers(response.headers);
      headers.set("Access-Control-Allow-Origin",env.APP_ORIGIN || new URL(request.url).origin);
      headers.set("Access-Control-Allow-Credentials","true");
      headers.set("Vary","Origin");
      return new Response(response.body,{status:response.status,headers});
    } catch (error) {
      return json({error:"Internal server error",detail:env.ENVIRONMENT === "development" ? String(error) : undefined},500);
    }
  }
};