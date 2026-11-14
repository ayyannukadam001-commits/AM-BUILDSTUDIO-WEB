import assert from "node:assert/strict";
import { createAndroidProject } from "../worker/src/android-generator.js";

const starter = createAndroidProject({
  name: "Demo Racing Game",
  kind: "Game",
  description: "A test project"
});
assert.equal(starter.kind, "Game");
assert.ok(starter.packageName.startsWith("com.ambuildstudio.generated."));
assert.ok(starter.files["settings.gradle.kts"]);
assert.ok(starter.files["build.gradle.kts"]);
assert.ok(starter.files["gradle.properties"]);
assert.ok(starter.files["app/build.gradle.kts"]);
assert.ok(starter.files["app/src/main/AndroidManifest.xml"]);
const starterKotlinPath = Object.keys(starter.files).find(file => file.endsWith("/MainActivity.kt"));
assert.ok(starterKotlinPath, "MainActivity source must exist");
assert.ok(starter.files[starterKotlinPath].includes("Demo Racing Game"));
assert.ok(starter.files["app/src/main/AndroidManifest.xml"].includes("Demo Racing Game"));

const planned = createAndroidProject({
  name: "Planned App",
  kind: "App",
  description: "Test",
  plan: {
    summary: "AI generated summary",
    screens: ["Home", "Profile"],
    features: ["Sign in", "Search"]
  }
});
const plannedKotlin = Object.values(planned.files).find(value => value.includes("fun GeneratedHome"));
assert.ok(plannedKotlin.includes("AI generated summary"));
assert.ok(plannedKotlin.includes("Current screen: "));
assert.ok(plannedKotlin.includes("Profile"));
assert.ok(plannedKotlin.includes("Sign in"));

const hostile = createAndroidProject({ name: "../Bad \"Name\" $x", kind: "App" });
const hostileKotlin = Object.entries(hostile.files).find(([file]) => file.endsWith("/MainActivity.kt"))?.[1] || "";
assert.ok(!hostile.packageName.includes("/"));
assert.ok(!hostile.packageName.includes(".."));
assert.ok(hostileKotlin.includes("Bad"));
assert.ok(!hostileKotlin.includes("undefined"));

const fallback = createAndroidProject({ name: "!!!", kind: "App" });
assert.ok(/^com\.ambuildstudio\.generated\.[a-z_]+$/.test(fallback.packageName));
console.log("Android generator tests passed.");
