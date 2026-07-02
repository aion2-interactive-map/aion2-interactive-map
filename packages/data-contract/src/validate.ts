// Node-only validation of a `data/` repo checkout against the contract.
// Imports are kept erasable so Node can run this via native type stripping
// (no build step); browser code should import types/schemas only.
import { readFileSync, readdirSync, existsSync } from "node:fs";
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

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
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
  if (!existsSync(mapsPath)) return [{ file: mapsPath, message: "missing maps.json" }];
  check(issues, "maps.json", mapsFileSchema, readJson(mapsPath));

  const typesPath = join(dir, "types.json");
  if (!existsSync(typesPath)) {
    issues.push({ file: typesPath, message: "missing types.json" });
  } else {
    check(issues, "types.json", typesFileSchema, readJson(typesPath));
  }

  const perMapFiles: Record<"markers" | "regions", string[]> = { markers: [], regions: [] };
  for (const sub of ["markers", "regions"] as const) {
    const subdir = join(dir, sub);
    if (!existsSync(subdir)) {
      issues.push({ file: subdir, message: `missing ${sub}/` });
      continue;
    }
    for (const f of jsonFiles(subdir)) {
      perMapFiles[sub].push(f);
      check(
        issues,
        `${sub}/${f}`,
        sub === "markers" ? rawMarkersFileSchema : rawRegionsFileSchema,
        readJson(join(subdir, f)),
      );
    }
  }

  // Locale layout: locales/<lng>/ must mirror the generated namespaces:
  // maps.json + types.json, plus markers/<Map>.json and regions/<Map>.json
  // for every per-map file that exists at the repo root.
  const localesDir = join(dir, "locales");
  if (!existsSync(localesDir)) {
    issues.push({ file: localesDir, message: "missing locales/" });
  } else {
    for (const lng of readdirSync(localesDir)) {
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
