// src/utils/userMarkerLocalIcons.ts
import type { UserMarkerInstance, UserMarkerLocalType } from "@/types/game.ts";

export const USER_MARKER_LOCAL_ICON_MAP: Record<UserMarkerLocalType, string> = {
  completed: "images/Markers/Completed.svg",
  location: "images/Markers/Location.svg",
  fox: "images/Markers/Fox.svg",
  favorite: "images/Markers/Favorite.svg",
  gathering: "images/Markers/Gathering.svg",
  creature: "images/Markers/Creature.svg",
};

/**
 * UI render order for the localType picker.
 * Add/remove/reorder here to control the selection UI order.
 */
export const USER_MARKER_LOCAL_ICON_ORDER: UserMarkerLocalType[] = [
  "fox",
  "location",
  "favorite",
  "gathering",
  "creature",
  "completed",
];

/**
 * Optional: UI labels (good for i18n keys or fallbacks)
 * You can use these as i18n keys, or plain labels.
 */
export const USER_MARKER_LOCAL_ICON_LABEL_KEY: Record<UserMarkerLocalType, string> = {
  location: "common:userMarkerLocalType.location",
  favorite: "common:userMarkerLocalType.favorite",
  gathering: "common:userMarkerLocalType.gathering",
  creature: "common:userMarkerLocalType.creature",
  fox: "common:userMarkerLocalType.fox",
  completed: "common:userMarkerLocalType.completed",
};

export function getUserMarkerLocalIcon(marker: UserMarkerInstance): string | null {
  if (marker.type !== "local") return null;
  if (!marker.localType) return null;
  return USER_MARKER_LOCAL_ICON_MAP[marker.localType] ?? null;
}
