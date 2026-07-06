// Usage: node packages/data-contract/scripts/validate-data.ts [path-to-data-repo]
// Runs on plain Node via native type stripping (Node >= 22.18); no build step.
import { validateDataRepo } from "../src/validate.ts";
import { CONTRACT_VERSION } from "../src/types.ts";

const dir = process.argv[2] ?? "../data";
const issues = validateDataRepo(dir);
if (issues.length) {
  for (const i of issues) console.error(`${i.file}: ${i.message}`);
  console.error(`${issues.length} issue(s) found in ${dir}`);
  process.exit(1);
}
console.log(`data repo at ${dir} is valid (contract v${CONTRACT_VERSION})`);
