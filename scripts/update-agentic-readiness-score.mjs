import { readFile, writeFile } from "node:fs/promises";

const checklistPath = new URL("../docs/agentic-readiness-checklist.md", import.meta.url);
const includedSections = new Set([1, 2, 3, 5, 6, 7, 8]);
const checklist = await readFile(checklistPath, "utf8");
const lines = checklist.split("\n");

let section = null;
let done = 0;
let partial = 0;
let open = 0;
let scored = 0;

for (const line of lines) {
  const heading = line.match(/^## (\d+)\./);
  if (heading) {
    section = Number(heading[1]);
    continue;
  }

  if (!includedSections.has(section)) continue;

  const status = line.match(/^\s*- \[(x|~| |external)\]/)?.[1];
  if (!status) continue;

  scored += 1;
  if (status === "x") done += 1;
  else if (status === "~") partial += 1;
  else open += 1;
}

if (scored === 0) throw new Error("No scored checklist items found.");

const percentage = Math.round(((done + partial * 0.5) / scored) * 100);
const filled = Math.round(percentage / 10);
const bar = `${"█".repeat(filled)}${"░".repeat(10 - filled)}`;
const scoreLine = `\`[${bar}] ${percentage}%\` (${done} done, ${partial} partial, ${open} open or external; ${scored} scored items).`;
const scorePattern = /^`\[[█░]+\] \d+%` \(\d+ done, \d+ partial, \d+ open or external; \d+ scored items\)\.$/m;

if (!scorePattern.test(checklist)) {
  throw new Error("Could not find the generated readiness score line to replace.");
}

await writeFile(checklistPath, checklist.replace(scorePattern, scoreLine));
console.log(`Updated readiness score: ${percentage}% (${done} done, ${partial} partial, ${open} open or external; ${scored} scored).`);
