// Zod schemas mirroring the contract interfaces in ./types.ts.
//
// Each schema carries a `satisfies z.ZodType<T>` drift guard: if a schema
// stops matching its interface (missing field, wrong type), `tsc` fails.
// Schemas deliberately do NOT use `.strict()` — real data files may carry
// extra fields (e.g. `order` on maps/categories, `z` on markers) and the
// contract only asserts the fields the frontend relies on.
import { z } from "zod";
import type {
  GameMapMeta,
  MarkerTypeCategory,
  MarkerTypeSubtype,
  MarkerEntityRef,
  MarkerInstance,
  RegionInstance,
  MapsFile,
  TypesFile,
  RawMarkersFile,
  RawRegionsFile,
} from "./types.ts";

export const gameMapMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  tileWidth: z.number(),
  tileHeight: z.number(),
  tilesCountX: z.number(),
  tilesCountY: z.number(),
  isVisible: z.boolean(),
}) satisfies z.ZodType<GameMapMeta>;

export const markerTypeSubtypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().optional(),
  icon: z.string().optional(),
  iconScale: z.number().optional(),
  hideTooltip: z.boolean().optional(),
  color: z.string().optional(),
  canComplete: z.boolean().optional(),
  iconComplete: z.string().optional(),
}) satisfies z.ZodType<MarkerTypeSubtype>;

export const markerTypeCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
  subtypes: z.array(markerTypeSubtypeSchema),
}) satisfies z.ZodType<MarkerTypeCategory>;

export const markerEntityRefSchema = z.object({
  type: z.enum(["quest", "npc", "item"]),
  id: z.number(),
}) satisfies z.ZodType<MarkerEntityRef>;

export const markerInstanceSchema = z.object({
  id: z.string(),
  category: z.string().optional(),
  subtype: z.string(),
  region: z.string().optional(),
  x: z.number(),
  y: z.number(),
  images: z.array(z.string()),
  contributors: z.array(z.string()),
  icon: z.string().optional(),
  name: z.string().optional(),
  indexInSubtype: z.number(),
  tier: z.number().optional(),
  fragmentType: z.enum(["ground", "air", "water"]).optional(),
  entity: markerEntityRefSchema.optional(),
}) satisfies z.ZodType<MarkerInstance>;

export const regionInstanceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  borders: z.array(z.array(z.array(z.number()))),
}) satisfies z.ZodType<RegionInstance>;

export const mapsFileSchema = z.object({
  maps: z.array(gameMapMetaSchema),
}) satisfies z.ZodType<MapsFile>;

export const typesFileSchema = z.object({
  categories: z.array(markerTypeCategorySchema),
}) satisfies z.ZodType<TypesFile>;

export const rawMarkersFileSchema = z.object({
  markers: z.array(markerInstanceSchema),
}) satisfies z.ZodType<RawMarkersFile>;

export const rawRegionsFileSchema = z.object({
  regions: z.array(regionInstanceSchema),
}) satisfies z.ZodType<RawRegionsFile>;
