import assert from "node:assert/strict";
import worker from "../worker/src/index.js";

const calls = [];
const env = {
  APP_ORIGIN: "https://example.com",
  BUILD_CALLBACK_SECRET: "test-callback-secret",
  DB: {
    prepare(sql) {
      return {
        bind(...args) {
          calls.push({ sql, args });
          return {
            first: async () => ({ ok: 1 }),
            run: async () => ({ meta: { changes: 1 } }),
            all: async () => ({ results: [] })
          };
        }
      };
    }
  }
};

const health = await worker.fetch(new Request("https://worker.example/api/health"), env);
assert.equal(health.status, 200);
const healthBody = await health.json();
assert.equal(healthBody.ok, true);
assert.equal(healthBody.buildConfigured, false);

const denied = await worker.fetch(new Request("https://worker.example/api/builds/callback", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Build-Callback-Secret": "wrong" },
  body: JSON.stringify({ job_id: "job-1", status: "running" })
}), env);
assert.equal(denied.status, 401);

const callback = await worker.fetch(new Request("https://worker.example/api/builds/callback", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Build-Callback-Secret": "test-callback-secret" },
  body: JSON.stringify({ job_id: "job-1", status: "succeeded", workflow_run_id: 123, workflow_url: "https://github.com/example/repo/actions/runs/123", artifact_name: "test.apk.zip", message: "APK uploaded." })
}), env);
assert.equal(callback.status, 200);
assert.equal((await callback.json()).ok, true);
assert.ok(calls.some(call => call.sql.includes("UPDATE build_jobs") && call.args[0] === "succeeded" && call.args.at(-1) === "job-1"));
console.log("Worker health and build callback tests passed.");
