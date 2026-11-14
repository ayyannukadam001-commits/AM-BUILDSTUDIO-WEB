export async function onRequest(context) {
  const apiOrigin = context.env.API_ORIGIN;
  if (!apiOrigin) return new Response(JSON.stringify({error:"API_ORIGIN is not configured for this Pages deployment."}), {status:503,headers:{"content-type":"application/json"}});
  let upstream;
  try { upstream = new URL(apiOrigin); } catch { return new Response(JSON.stringify({error:"Invalid API_ORIGIN configuration."}), {status:500,headers:{"content-type":"application/json"}}); }
  const target = new URL(context.request.url);
  target.protocol = upstream.protocol;
  target.host = upstream.host;
  const headers = new Headers(context.request.headers);
  headers.delete("host");
  return fetch(new Request(target.toString(), new Request(context.request, {headers})));
}
