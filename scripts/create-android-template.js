import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createAndroidProject } from "../worker/src/android-generator.js";
const project = createAndroidProject({
  name: process.env.PROJECT_NAME || "AM Buildstudio Starter",
  kind: process.env.PROJECT_KIND === "Game" ? "Game" : "App",
  description: process.env.PROJECT_DESCRIPTION || "Generated and built by the AM BUILDSTUDIO Android CI workflow."
});
for (const [relative,content] of Object.entries(project.files)) {
  const target=path.join("android-output",relative);
  await mkdir(path.dirname(target),{recursive:true});
  await writeFile(target,content,"utf8");
}
console.log("Generated",Object.keys(project.files).length,"Android project files.");
