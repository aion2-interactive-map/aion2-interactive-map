import {
  Diamond,
  Gem,
  Leaf,
  MapPin,
  PawPrint,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

/**
 * Per-category section icon (UI icon, NOT from game data). One distinct lucide
 * glyph per marker category. Shared by the sidebar category rows and the search
 * result cards.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  location: MapPin,
  collection: Gem,
  gathering: Leaf,
  quest: ScrollText,
  creature: PawPrint,
};

export function getCategoryIcon(category: string | undefined): LucideIcon {
  return (category ? CATEGORY_ICONS[category] : undefined) ?? Diamond;
}
