// src/utils/yamlLoader.ts
import { parse } from "yaml";

  export async function fetchYaml<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return parse(text) as T;
}
