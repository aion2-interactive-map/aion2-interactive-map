// Node-only validation of a `data/` repo checkout against the contract.
// Imports are kept erasable so Node can run this via native type stripping
// (no build step); browser code should import types/schemas only.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import {
  mapsFileSchema,
  typesFileSchema,
  rawMarkersFileSchema,
  rawRegionsFileSchema,
} from "./schemas.ts";

export interface ValidationIssue {
  file: string;
  message: string;
}

function check(
  issues: ValidationIssue[],
  file: string,
  schema: z.ZodType,
  data: unknown,
): void {
  const r = schema.safeParse(data);
  if (!r.success) {
    for (const issue of r.error.issues) {
      issues.push({ file, message: `${issue.path.join(".")}: ${issue.message}` });
    }
  }
}

/**
 * Read + parse a JSON file, then validate it against `schema`. A parse
 * failure is reported as a ValidationIssue for `file` (repo-relative path)
 * instead of throwing; schema validation is skipped for that file.
 */
function checkFile(
  issues: ValidationIssue[],
  file: string,
  schema: z.ZodType,
  path: string,
): void {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    issues.push({
      file,
      message: `failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`,
    });
    return;
  }
  check(issues, file, schema, data);
}

function jsonFiles(dir: string): string[] {
  return readdirSync(dir).filter((f) => f.endsWith(".json"));
}

/**
 * Validate a data repo checkout:
 * - `maps.json` / `types.json` at the root,
 * - `markers/<Map>.json` / `regions/<Map>.json` per map,
 * - locale layout `locales/<lng>/{maps.json, types.json, markers/<Map>.json,
 *   regions/<Map>.json}` for every language directory.
 */
export function validateDataRepo(dir: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const mapsPath = join(dir, "maps.json");
  if (!existsSync(mapsPath)) {
    issues.push({ file: "maps.json", message: "missing maps.json" });
  } else {
    checkFile(issues, "maps.json", mapsFileSchema, mapsPath);
  }

  const typesPath = join(dir, "types.json");
  if (!existsSync(typesPath)) {
    issues.push({ file: "types.json", message: "missing types.json" });
  } else {
    checkFile(issues, "types.json", typesFileSchema, typesPath);
  }

  const perMapFiles: Record<"markers" | "regions", string[]> = { markers: [], regions: [] };
  for (const sub of ["markers", "regions"] as const) {
    const subdir = join(dir, sub);
    if (!existsSync(subdir)) {
      issues.push({ file: `${sub}/`, message: `missing ${sub}/` });
      continue;
    }
    if (!statSync(subdir).isDirectory()) {
      issues.push({ file: `${sub}/`, message: `${sub} is not a directory` });
      continue;
    }
    for (const f of jsonFiles(subdir)) {
      perMapFiles[sub].push(f);
      checkFile(
        issues,
        `${sub}/${f}`,
        sub === "markers" ? rawMarkersFileSchema : rawRegionsFileSchema,
        join(subdir, f),
      );
    }
  }

  // Locale layout: locales/<lng>/ must mirror the generated namespaces:
  // maps.json + types.json, plus markers/<Map>.json and regions/<Map>.json
  // for every per-map file that exists at the repo root.
  const localesDir = join(dir, "locales");
  if (!existsSync(localesDir)) {
    issues.push({ file: "locales/", message: "missing locales/" });
  } else if (!statSync(localesDir).isDirectory()) {
    issues.push({ file: "locales/", message: "locales is not a directory" });
  } else {
    // Only directories are language dirs; ignore stray files (e.g. .DS_Store).
    const lngs = readdirSync(localesDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    for (const lng of lngs) {
      for (const ns of ["maps.json", "types.json"]) {
        if (!existsSync(join(localesDir, lng, ns))) {
          issues.push({ file: `locales/${lng}/${ns}`, message: "missing generated namespace" });
        }
      }
      for (const sub of ["markers", "regions"] as const) {
        for (const f of perMapFiles[sub]) {
          if (!existsSync(join(localesDir, lng, sub, f))) {
            issues.push({
              file: `locales/${lng}/${sub}/${f}`,
              message: "missing generated namespace",
            });
          }
        }
      }
    }
  }

  return issues;
}
