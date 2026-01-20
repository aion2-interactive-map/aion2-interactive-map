import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ItemDataProvider, useItemData } from "@/context/ItemDataContext.tsx";
import { Card, CardBody, Tab, Tabs } from "@heroui/react";
import { EquipmentsView } from "@/components/Crafting/EquipmentsView.tsx";
import { MaterialsView } from "@/components/Crafting/MaterialsView.tsx";
import { useTranslation } from "react-i18next";
import type { SelectedBySlotKey } from "@/types/crafting.ts";
import { useTheme } from "@/context/ThemeContext";
import {getStaticUrl} from "@/utils/url.ts";
import Footer from "@/components/Footer.tsx";

const STORAGE_SELECTED_TIER = "aion2.crafting.selectedTier.v1";

const STORAGE_SELECTED_EQUIPMENTS_LIGHT = "aion2.crafting.selectedEquipments.v1.light";
const STORAGE_SELECTED_EQUIPMENTS_DARK = "aion2.crafting.selectedEquipments.v1.dark";

type Race = "light" | "dark";

const TIER_KEYS_LIGHT = ["trueDragon", "whiteDragon", "wiseDragon", "nobleDragon"] as const;
const TIER_KEYS_DARK = ["starDragon", "darkDragon", "ebonyDragon", "hornedDragon"] as const;

type TierKeyLight = (typeof TIER_KEYS_LIGHT)[number];
type TierKeyDark = (typeof TIER_KEYS_DARK)[number];
type TierKey = TierKeyLight | TierKeyDark;

function tiersForRace(race: Race): readonly TierKey[] {
  return (race === "light" ? TIER_KEYS_LIGHT : TIER_KEYS_DARK) as readonly TierKey[];
}

function storageKeyForRace(race: Race): string {
  return race === "light" ? STORAGE_SELECTED_EQUIPMENTS_LIGHT : STORAGE_SELECTED_EQUIPMENTS_DARK;
}

function clampCount(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.floor(v));
}


function normalizeSelectedBySlotKey(raw: unknown): SelectedBySlotKey {
  // Supports:
  // - new shape: { [slotKey]: { itemId, count } }
  // - old shape #1: { [slotKey]: number|null }
  // - old shape #2: { [slotKey]: { itemId, disabled } }  (disabled => count 0/1)
  if (!raw || typeof raw !== "object") return {};

  const obj = raw as Record<string, any>;
  const out: SelectedBySlotKey = {};

  for (const [slotKey, v] of Object.entries(obj)) {
    // old shape: number|null
    if (typeof v === "number" || v === null) {
      out[slotKey] = { itemId: v, count: v == null ? 0 : 1 };
      continue;
    }

    if (v && typeof v === "object") {
      const itemId =
        "itemId" in v && (typeof v.itemId === "number" || v.itemId === null)
          ? (v.itemId as number | null)
          : null;

      // new shape: count
      if ("count" in v) {
        const count = clampCount(v.count);
        out[slotKey] = { itemId, count: itemId == null ? 0 : count };
        continue;
      }

      // old shape: disabled
      if ("disabled" in v) {
        const disabled = typeof v.disabled === "boolean" ? (v.disabled as boolean) : false;
        out[slotKey] = { itemId, count: itemId == null ? 0 : (disabled ? 0 : 1) };
        continue;
      }

      // unknown object -> safe default
      out[slotKey] = { itemId: null, count: 0 };
      continue;
    }

    out[slotKey] = { itemId: null, count: 0 };
  }

  return out;
}

function readStoredSelectedBySlotKey(race: Race): SelectedBySlotKey {
  try {
    const raw = localStorage.getItem(storageKeyForRace(race));
    return raw ? normalizeSelectedBySlotKey(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

function hasAnySelection(obj: SelectedBySlotKey | null | undefined): boolean {
  if (!obj) return false;
  return Object.values(obj).some((v) => v?.itemId != null);
}

function readStoredTier(race: Race): TierKey {
  // Single key is fine; we validate against the current race tier list.
  try {
    const raw = localStorage.getItem(STORAGE_SELECTED_TIER);
    const list = tiersForRace(race) as readonly string[];
    if (raw && list.includes(raw)) return raw as TierKey;
    return tiersForRace(race)[0] as TierKey;
  } catch {
    return tiersForRace(race)[0] as TierKey;
  }
}

function Page() {
  const { loading, tiers, slots, itemsById } = useItemData();
  const { t } = useTranslation();
  const { theme, setThemeHint } = useTheme();

  // Race state (light/dark)
  const [race, setRace] = useState<Race>("light");

  // Keep tier tab index on race switch
  const [activeTierIndex, setActiveTierIndex] = useState<number>(0);
  const tierKeys = useMemo(() => tiersForRace(race), [race]);

  const [activeTier, setActiveTier] = useState<TierKey>(() => readStoredTier("light"));

  // Selection state (per-race storage)
  const [selectedBySlotKey, setSelectedBySlotKey] = useState<SelectedBySlotKey>(() =>
    readStoredSelectedBySlotKey("light"),
  );

  // Persist selection to the CURRENT race key
  useEffect(() => {
    localStorage.setItem(storageKeyForRace(race), JSON.stringify(selectedBySlotKey));
  }, [race, selectedBySlotKey]);

  // Hint theme in auto mode when race changes
  useEffect(() => {
    // Always keep hint synced; it only takes effect when theme === "auto"
    setThemeHint(race === "light" ? "light" : "dark");
  }, [race, theme, setThemeHint]);

  // When race changes:
  // 1) load selection from that race storage (higher priority)
  // 2) keep tier index, then set activeTier to the tier at that index
  useEffect(() => {
    const stored = readStoredSelectedBySlotKey(race);
    setSelectedBySlotKey(stored);

    const nextTierKey = tierKeys[Math.min(activeTierIndex, tierKeys.length - 1)] as TierKey;
    setActiveTier(nextTierKey);
  }, [race, tierKeys, activeTierIndex]);

  // Persist selected tier key (single key)
  useEffect(() => {
    localStorage.setItem(STORAGE_SELECTED_TIER, activeTier);
  }, [activeTier]);

  // If tiers.yaml loads and current activeTier is not present, fallback safely for this race
  useEffect(() => {
    if (!tiers || tiers.length === 0) return;

    const list = tierKeys as readonly string[];
    const tierKeyOk = list.includes(activeTier);

    if (!tierKeyOk) {
      const nextTierKey = tierKeys[Math.min(activeTierIndex, tierKeys.length - 1)] as TierKey;
      setActiveTier(nextTierKey);
      return;
    }

    const existsInData = tiers.some((tt) => tt.name === activeTier);
    if (existsInData) return;

    const firstExisting = tierKeys.find((k) => tiers.some((tt) => tt.name === k));
    if (firstExisting) {
      const idx = tierKeys.findIndex((k) => k === firstExisting);
      setActiveTierIndex(Math.max(0, idx));
      setActiveTier(firstExisting);
    }
  }, [tiers, tierKeys, activeTier, activeTierIndex]);

  // Autofill on tier change ONLY if this race has no stored selection
  const skipAutofillRef = useRef<boolean>(hasAnySelection(readStoredSelectedBySlotKey("light")));
  useEffect(() => {
    skipAutofillRef.current = hasAnySelection(readStoredSelectedBySlotKey(race));
  }, [race]);

  useEffect(() => {
    if (loading) return;
    if (!slots.length) return;

    const tier = tiers.find((tt) => tt.name === activeTier);
    if (!tier || tier.items.length === 0) return;

    if (skipAutofillRef.current) return;

    setSelectedBySlotKey((prev) => {
      const next: SelectedBySlotKey = { ...prev };

      for (const slot of slots) {
        const prevState = prev[slot.key];
        const allowedTypes = slot.allowed_types ?? [];

        if (allowedTypes.length === 0) {
          // preserve count (still meaningful if later item appears), but no item
          next[slot.key] = { itemId: null, count: prevState?.count ?? 0 };
          continue;
        }

        // Determine target subtype:
        let targetSubtype = allowedTypes[0];

        if (prevState?.itemId) {
          const prevItem = itemsById.get(prevState.itemId);
          if (prevItem?.subtype) targetSubtype = prevItem.subtype;
        }

        // Pick first tier item matching targetSubtype
        let picked: number | null = null;
        for (const id of tier.items) {
          const it = itemsById.get(id);
          if (it?.subtype === targetSubtype) {
            picked = id;
            break;
          }
        }

        // If we picked an item and count is 0, default to 1.
        const prevCount = prevState?.count ?? 0;
        next[slot.key] = {
          itemId: picked,
          count: picked == null ? 0 : Math.max(1, prevCount),
        };
      }

      return next;
    });
  }, [activeTier, tiers, slots, itemsById, loading]);

  // UI handlers
  function onRaceChange(nextRace: Race) {
    if (nextRace === race) return;
    setRace(nextRace);
  }

  function onTierChange(nextTier: TierKey) {
    // user action: allow autofill next time for this race
    skipAutofillRef.current = false;

    // keep the active index synced
    const idx = tierKeys.findIndex((k) => k === nextTier);
    if (idx >= 0) setActiveTierIndex(idx);

    // Clear ALL slot selections (itemId + count)
    setSelectedBySlotKey({});

    setActiveTier(nextTier);
  }

  return (
    <div className="flex h-full w-full flex-col bg-crafting-page overflow-y-auto">
      <div className="grid w-full flex-1" style={{ gridTemplateColumns: "1fr 1068px 1fr" }}>
        <div className="hidden lg:flex items-center justify-center">
          <img
            src={getStaticUrl("images/CraftAdv.webp")}
            alt="Left decoration"
            className="w-[220px]"
          />
        </div>

        <div className="mx-auto w-full max-w-[1068px] pt-3 px-4 sm:px-0">
          {/* Split header row: left (race tabs) aligned with left card, right (tier tabs) aligned with right card */}
          <div className="mb-4 flex flex-col md:flex-row gap-4 md:pr-1">
            {/* Left container (align with left card width) */}
            <div className="w-full md:w-[220px] shrink-0">
              <Tabs
                selectedKey={race}
                onSelectionChange={(k) => onRaceChange(k as Race)}
                variant="bordered"
                className="w-full bg-transparent"
                classNames={{
                  tabList: "flex w-full rounded-[15px] border-1 border-crafting-border ",
                  tab: "h-[34px] flex-1 justify-center " +
                    "data-[selected=true]:bg-primary " +
                    "dark:data-[selected=true]:bg-default-800",
                  tabContent: "flex items-center justify-center text-default-800 group-data-[selected=true]:text-background ",
                }}
              >
                <Tab key="light" title={t("common:server.light", "Light")} />
                <Tab key="dark" title={t("common:server.dark", "Dark")} />
              </Tabs>
            </div>

            {/* Right container (fills remaining width) */}
            <div className="min-w-0 flex-1">
              <Tabs
                selectedKey={activeTier}
                onSelectionChange={(k) => onTierChange(k as TierKey)}
                variant="underlined"
                color={race == "light" ? "primary" : "default"}
                className="w-full md:w-[832px] border-gray-300 bg-transparent"
                classNames={{
                  tabList: "flex w-full overflow-x-auto no-scrollbar",
                  tab: "h-[34px] flex-1 min-w-[100px] justify-center",
                  tabContent: "flex items-center justify-center text-default-700",
                }}
              >
                {tierKeys.map((k) => (
                  <Tab key={k} title={t(`items/tiers:${k}.name`)} />
                ))}
              </Tabs>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            {/* Left panel */}
            <Card
              className="h-auto md:h-[726px] w-full md:w-[220px] shrink-0 rounded-lg border-x-1 border-primary bg-crafting-equipment-view"
              shadow="none"
            >
              <CardBody className="h-full overflow-y-auto py-4 md:py-2">
                {loading ? (
                  <div className="text-sm text-default-500">Loading...</div>
                ) : (
                  <EquipmentsView
                    selectedBySlotKey={selectedBySlotKey}
                    setSelectedBySlotKey={setSelectedBySlotKey}
                    race={race}
                  />
                )}
              </CardBody>
            </Card>

            {/* Right panel */}
            <Card className="h-auto md:h-[726px] w-full md:w-[832px] min-w-0 bg-transparent" shadow="none">
              <CardBody className="h-full min-h-0 px-1 py-0">
                <MaterialsView selectedBySlotKey={selectedBySlotKey} />
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

const PageWrapper: React.FC = () => {
  return (
    <ItemDataProvider>
      <Page />
    </ItemDataProvider>
  );
};

export const Route = createFileRoute("/crafting")({
  component: PageWrapper,
});
