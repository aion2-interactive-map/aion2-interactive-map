import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ItemDataProvider, useItemData } from "@/context/ItemDataContext.tsx";
import { Card, CardBody, Tab, Tabs } from "@heroui/react";
import { EquipmentsView } from "@/components/EquipmentsView.tsx";
import { MaterialsView } from "@/components/MaterialsView.tsx";
import { useTranslation } from "react-i18next";
import type { SelectedEquipmentState, SelectedBySlotKey } from "@/types/crafting";

const STORAGE_SELECTED_EQUIPMENTS_LIGHT = "aion2.crafting.selectedEquipments.v1.light";
const STORAGE_SELECTED_EQUIPMENTS_DARK = "aion2.crafting.selectedEquipments.v1.dark";
const STORAGE_SELECTED_RACE = "aion2.crafting.selectedRace.v1";
const STORAGE_SELECTED_TIER_INDEX = "aion2.crafting.selectedTierIndex.v1";

const LIGHT_TIER_KEYS = ["trueDragon", "whiteDragon", "wiseDragon", "nobleDragon"] as const;
const DARK_TIER_KEYS = ["starDragon", "darkDragon", "ebonyDragon", "hornedDragon"] as const;

type LightTierKey = (typeof LIGHT_TIER_KEYS)[number];
type DarkTierKey = (typeof DARK_TIER_KEYS)[number];
type TierKey = LightTierKey | DarkTierKey;

type RaceMode = "light" | "dark";

function getEquipmentsStorageKey(race: RaceMode): string {
  return race === "light" ? STORAGE_SELECTED_EQUIPMENTS_LIGHT : STORAGE_SELECTED_EQUIPMENTS_DARK;
}

function readStoredRace(): RaceMode {
  try {
    const raw = localStorage.getItem(STORAGE_SELECTED_RACE);
    if (raw === "light" || raw === "dark") return raw;
    return "light";
  } catch {
    return "light";
  }
}

function readStoredTierIndex(): number {
  try {
    const raw = localStorage.getItem(STORAGE_SELECTED_TIER_INDEX);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function normalizeSelectedBySlotKey(raw: unknown): SelectedBySlotKey {
  // Supports:
  // - new shape: { [slotKey]: { itemId, disabled } }
  // - old shape: { [slotKey]: number|null }
  if (!raw || typeof raw !== "object") return {};

  const obj = raw as Record<string, any>;
  const out: SelectedBySlotKey = {};

  for (const [slotKey, v] of Object.entries(obj)) {
    // old shape (number|null)
    if (typeof v === "number" || v === null) {
      out[slotKey] = { itemId: v, disabled: false };
      continue;
    }

    // new shape
    if (v && typeof v === "object") {
      const itemId =
        "itemId" in v && (typeof v.itemId === "number" || v.itemId === null)
          ? (v.itemId as number | null)
          : null;

      const disabled =
        "disabled" in v && typeof v.disabled === "boolean" ? (v.disabled as boolean) : false;

      out[slotKey] = { itemId, disabled };
      continue;
    }

    out[slotKey] = { itemId: null, disabled: false };
  }

  return out;
}

function readStoredSelectedBySlotKey(race: RaceMode): SelectedBySlotKey {
  try {
    const raw = localStorage.getItem(getEquipmentsStorageKey(race));
    return raw ? normalizeSelectedBySlotKey(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

function hasAnySelection(obj: SelectedBySlotKey | null | undefined): boolean {
  if (!obj) return false;
  return Object.values(obj).some((v) => v?.itemId != null);
}

function ensureState(v: SelectedEquipmentState | undefined): SelectedEquipmentState {
  return v ?? { itemId: null, disabled: false };
}

function clampIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  if (i < 0) return 0;
  if (i >= len) return len - 1;
  return i;
}

function Page() {
  const { loading, tiers, slots, itemsById, craftingById } = useItemData();
  const { t } = useTranslation();

  const [raceMode, setRaceMode] = useState<RaceMode>(() => readStoredRace());

  useEffect(() => {
    localStorage.setItem(STORAGE_SELECTED_RACE, raceMode);
  }, [raceMode]);

  const tierKeysForRace = useMemo(
    () => (raceMode === "light" ? LIGHT_TIER_KEYS : DARK_TIER_KEYS),
    [raceMode],
  );

  const [tierIndex, setTierIndex] = useState<number>(() => readStoredTierIndex());

  useEffect(() => {
    localStorage.setItem(STORAGE_SELECTED_TIER_INDEX, String(tierIndex));
  }, [tierIndex]);

  const activeTier = useMemo<TierKey>(() => {
    const idx = clampIndex(tierIndex, tierKeysForRace.length);
    return tierKeysForRace[idx] as TierKey;
  }, [tierIndex, tierKeysForRace]);

  const [selectedBySlotKey, setSelectedBySlotKey] = useState<SelectedBySlotKey>(() =>
    readStoredSelectedBySlotKey(readStoredRace()),
  );

  // Persist selections into race-specific keys
  useEffect(() => {
    localStorage.setItem(getEquipmentsStorageKey(raceMode), JSON.stringify(selectedBySlotKey));
  }, [selectedBySlotKey, raceMode]);

  // Skip autofill ONLY ONCE on initial load if there is already stored selection for the initial race.
  const skipAutofillOnceRef = useRef<boolean>(hasAnySelection(readStoredSelectedBySlotKey(readStoredRace())));

  // When race changes, clamp tierIndex (keep index), and load selection from race-specific storage (higher priority)
  useEffect(() => {
    // keep tierIndex, but ensure it is valid for the new list
    setTierIndex((prev) => clampIndex(prev, tierKeysForRace.length));

    // load saved selection for the new race (higher priority than autofill)
    const loaded = readStoredSelectedBySlotKey(raceMode);
    setSelectedBySlotKey(loaded);

    // if there is stored selection, do not autofill; otherwise allow autofill
    skipAutofillOnceRef.current = hasAnySelection(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceMode, tierKeysForRace.length]);

  // If tiers.yaml loads and activeTier is not present, fallback to first existing tier within current race list (and update tierIndex).
  useEffect(() => {
    if (!tiers || tiers.length === 0) return;

    const tierExists = tiers.some((tt) => tt.name === activeTier);
    if (tierExists) return;

    const firstExisting = (tierKeysForRace as readonly TierKey[]).find((k) =>
      tiers.some((tt) => tt.name === k),
    );

    if (!firstExisting) return;

    const idx = (tierKeysForRace as readonly TierKey[]).indexOf(firstExisting);
    setTierIndex(idx >= 0 ? idx : 0);
  }, [tiers, activeTier, tierKeysForRace]);

  // Autofill / retarget when tier changes (and when race changes) — but only if not blocked by stored selection.
  useEffect(() => {
    if (loading) return;
    if (!slots.length) return;

    const tier = tiers.find((t) => t.name === activeTier);
    if (!tier || tier.items.length === 0) return;

    if (skipAutofillOnceRef.current) return;

    const isAllowedByRace = (craftedItemId: number): boolean => {
      const recipe = craftingById.get(craftedItemId);
      if (!recipe?.race) return false; // enforce: must have race
      return recipe.race === raceMode;
    };

    setSelectedBySlotKey((prev) => {
      const next: typeof prev = { ...prev };

      for (const slot of slots) {
        const prevState = prev[slot.key];
        const allowedTypes = slot.allowed_types ?? [];

        if (allowedTypes.length === 0) {
          next[slot.key] = { itemId: null, disabled: prevState?.disabled ?? false };
          continue;
        }

        // Determine target subtype:
        // - if current slot already has an item, keep its subtype
        // - else use the slot's first allowed type
        let targetSubtype: string;
        if (prevState?.itemId) {
          const prevItem = itemsById.get(prevState.itemId);
          targetSubtype = prevItem?.subtype ?? allowedTypes[0];
        } else {
          targetSubtype = allowedTypes[0];
        }

        // Pick first tier item matching subtype AND crafting race
        let picked: number | null = null;
        for (const id of tier.items) {
          const it = itemsById.get(id);
          if (!it) continue;
          if (it.subtype !== targetSubtype) continue;
          if (!isAllowedByRace(id)) continue;
          picked = id;
          break;
        }

        next[slot.key] = {
          itemId: picked,
          disabled: prevState?.disabled ?? false, // preserve disabled
        };
      }

      return next;
    });
  }, [activeTier, raceMode, tiers, slots, itemsById, craftingById, loading]);

  function onTierTabChange(nextTierKey: TierKey) {
    // user action => allow autofill after switching tier
    skipAutofillOnceRef.current = false;

    const idx = (tierKeysForRace as readonly TierKey[]).indexOf(nextTierKey);
    setTierIndex(idx >= 0 ? idx : 0);

    // clear only itemIds; keep disabled flags
    setSelectedBySlotKey((prev) => {
      const next: SelectedBySlotKey = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = { ...ensureState(next[key]), itemId: null };
      }
      return next;
    });
  }

  function onRaceTabChange(nextRace: RaceMode) {
    if (nextRace === raceMode) return;

    // Switching race: keep tier index; load storage for the other race as higher priority.
    setRaceMode(nextRace);
  }

  return (
    <div className="h-full w-full bg-crafting-page">
      <div className="mx-auto w-full max-w-[1466px] pt-3">
        {/* Tabs row: left container aligns to left card; right container aligns to right card */}
        <div className="mb-4 flex gap-4 pr-1">
          {/* Left tabs: race mode */}
          <div className="w-[220px] shrink-0">
            <Tabs
              selectedKey={raceMode}
              onSelectionChange={(k) => onRaceTabChange(k as RaceMode)}
              variant="underlined"
              color="primary"
              className="w-full border-b-1 border-gray-300 bg-transparent"
              classNames={{
                tabList: "flex w-full",
                tab: "h-[34px] flex-1 justify-center",
                tabContent: "flex items-center justify-center text-default-700",
              }}
            >
              <Tab key="light" title={t("common:crafting.light", "Light")} />
              <Tab key="dark" title={t("common:crafting.dark", "Dark")} />
            </Tabs>
          </div>

          {/* Right tabs: tier (depends on race mode) */}
          <div className="min-w-0 flex-1">
            <Tabs
              selectedKey={activeTier}
              onSelectionChange={(k) => onTierTabChange(k as TierKey)}
              variant="underlined"
              color="primary"
              className="w-full border-b-1 border-gray-300 bg-transparent"
              classNames={{
                tabList: "flex w-full",
                tab: "h-[34px] flex-1 justify-center",
                tabContent: "flex items-center justify-center text-default-700",
              }}
            >
              {(tierKeysForRace as readonly TierKey[]).map((k) => (
                <Tab key={k} title={t(`items/tiers:${k}.name`, k)} />
              ))}
            </Tabs>
          </div>
        </div>

        <div className="flex gap-4">
          <Card
            className="h-[726px] w-[220px] shrink-0 rounded-lg border-x-1 border-primary bg-crafting-equipment-view"
            shadow="none"
          >
            <CardBody className="h-full overflow-y-auto">
              {loading ? (
                <div className="text-sm text-default-500">Loading...</div>
              ) : (
                <EquipmentsView
                  selectedBySlotKey={selectedBySlotKey}
                  setSelectedBySlotKey={setSelectedBySlotKey}
                  race={raceMode}
                />
              )}
            </CardBody>
          </Card>

          <Card className="h-[726px] w-full min-w-0 bg-transparent" shadow="none">
            <CardBody className="h-full min-h-0 px-1 py-0">
              <MaterialsView selectedBySlotKey={selectedBySlotKey} />
            </CardBody>
          </Card>
        </div>
      </div>
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
