import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createAndroidProject } from "../worker/src/android-generator.js";

function readSpec() {
  const raw = process.env.PROJECT_SPEC_JSON;
  if (!raw) return null;
  if (raw.length > 60000) throw new Error("PROJECT_SPEC_JSON exceeds the 60 KB workflow input limit.");
  let spec;
  try { spec = JSON.parse(raw); } catch { throw new Error("PROJECT_SPEC_JSON must be valid JSON."); }
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) throw new Error("Project spec must be a JSON object.");
  const name = String(spec.name || process.env.PROJECT_NAME || "AM Buildstudio Project").trim();
  const kind = spec.kind === "Game" || process.env.PROJECT_KIND === "Game" ? "Game" : "App";
  const description = String(spec.description || process.env.PROJECT_DESCRIPTION || "").trim();
  if (!name || name.length > 80) throw new Error("Project name must contain 1–80 characters.");
  if (description.length > 5000) throw new Error("Project description must be at most 5,000 characters.");
  const plan = spec.plan && typeof spec.plan === "object" ? spec.plan : null;
  if (plan && (!Array.isArray(plan.screens) || !Array.isArray(plan.features))) {
    throw new Error("Project plan must include screens and features arrays.");
  }
  return { name, kind, description, plan };
}

const spec = readSpec();
const project = createAndroidProject(spec || {
  name: process.env.PROJECT_NAME || "AM Buildstudio Starter",
  kind: process.env.PROJECT_KIND === "Game" ? "Game" : "App",
  description: process.env.PROJECT_DESCRIPTION || "Generated Android starter project"
});
for (const [relative, content] of Object.entries(project.files)) {
  const target = path.join("android-output", relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}
console.log(JSON.stringify({
  event: "project_generated",
  projectName: project.name,
  projectKind: project.kind,
  packageName: project.packageName,
  fileCount: Object.keys(project.files).length,
  projectSpecific: Boolean(spec)
}));
