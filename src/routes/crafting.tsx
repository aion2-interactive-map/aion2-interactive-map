import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useRef, useState } from "react";
import { ItemDataProvider, useItemData } from "@/context/ItemDataContext.tsx";
import { Card, CardBody, Tab, Tabs } from "@heroui/react";
import { EquipmentsView } from "@/components/EquipmentsView.tsx";
import { MaterialsView } from "@/components/MaterialsView.tsx";
import { useTranslation } from "react-i18next";
import type { SelectedEquipmentState, SelectedBySlotKey } from "@/types/crafting";

const STORAGE_SELECTED_EQUIPMENTS = "aion2.crafting.selectedEquipments.v1";
const STORAGE_SELECTED_TIER = "aion2.crafting.selectedTier.v1";

const TIER_KEYS = ["trueDragon", "whiteDragon", "wiseDragon", "nobleDragon"] as const;
type TierKey = (typeof TIER_KEYS)[number];

function readStoredTier(): TierKey {
  try {
    const raw = localStorage.getItem(STORAGE_SELECTED_TIER);
    if (raw && (TIER_KEYS as readonly string[]).includes(raw)) return raw as TierKey;
    return "trueDragon";
  } catch {
    return "trueDragon";
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
        "itemId" in v && (typeof v.itemId === "number" || v.itemId === null) ? (v.itemId as number | null) : null;
      const disabled = "disabled" in v && typeof v.disabled === "boolean" ? (v.disabled as boolean) : false;
      out[slotKey] = { itemId, disabled };
      continue;
    }

    out[slotKey] = { itemId: null, disabled: false };
  }

  return out;
}

function readStoredSelectedBySlotKey(): SelectedBySlotKey {
  try {
    const raw = localStorage.getItem(STORAGE_SELECTED_EQUIPMENTS);
    return raw ? normalizeSelectedBySlotKey(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

function hasAnySelection(obj: SelectedBySlotKey | null | undefined): boolean {
  if (!obj) return false;
  return Object.values(obj).some((v) => v?.itemId != null);
}

function ensureState(
  v: SelectedEquipmentState | undefined,
): SelectedEquipmentState {
  return v ?? { itemId: null, disabled: false };
}

function Page() {
  const { loading, tiers, slots, itemsById } = useItemData();
  const { t } = useTranslation();

  const [selectedBySlotKey, setSelectedBySlotKey] = useState<SelectedBySlotKey>(() =>
    readStoredSelectedBySlotKey(),
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_SELECTED_EQUIPMENTS, JSON.stringify(selectedBySlotKey));
  }, [selectedBySlotKey]);

  const [activeTier, setActiveTier] = useState<TierKey>(() => readStoredTier());

  useEffect(() => {
    localStorage.setItem(STORAGE_SELECTED_TIER, activeTier);
  }, [activeTier]);

  // Skip autofill ONLY ONCE on initial load if there is already stored selection.
  const skipAutofillOnceRef = useRef<boolean>(hasAnySelection(readStoredSelectedBySlotKey()));

  // If tiers.yaml loads and current activeTier is not present, fallback to first existing.
  // IMPORTANT: do NOT override a valid stored tier.
  useEffect(() => {
    if (!tiers || tiers.length === 0) return;

    const tierExists = tiers.some((tt) => tt.name === activeTier);
    if (tierExists) return;

    const firstExisting = TIER_KEYS.find((k) => tiers.some((tt) => tt.name === k));
    if (firstExisting) setActiveTier(firstExisting);
  }, [tiers, activeTier]);

  useEffect(() => {
    if (loading) return;
    if (!slots.length) return;

    const tier = tiers.find((t) => t.name === activeTier);
    if (!tier || tier.items.length === 0) return;

    setSelectedBySlotKey((prev) => {
      const next: typeof prev = { ...prev };

      for (const slot of slots) {
        const prevState = prev[slot.key];
        const allowedTypes = slot.allowed_types ?? [];

        if (allowedTypes.length === 0) {
          next[slot.key] = {
            itemId: null,
            disabled: prevState?.disabled ?? false,
          };
          continue;
        }

        // 1️⃣ Determine target subtype
        let targetSubtype: string | null = null;

        if (prevState?.itemId) {
          const prevItem = itemsById.get(prevState.itemId);
          targetSubtype = prevItem?.subtype ?? allowedTypes[0];
        } else {
          targetSubtype = allowedTypes[0];
        }

        // 2️⃣ Pick first tier item matching subtype
        let picked: number | null = null;
        for (const id of tier.items) {
          const it = itemsById.get(id);
          if (it?.subtype === targetSubtype) {
            picked = id;
            break;
          }
        }

        next[slot.key] = {
          itemId: picked,
          disabled: prevState?.disabled ?? false, // ✅ preserve disabled
        };
      }

      return next;
    });
  }, [
    activeTier,
    tiers,
    slots,
    itemsById,
    loading,
  ]);



  return (
    <div className="h-full w-full bg-crafting-page">
      <div className="mx-auto w-full max-w-[1466px] pt-3">
        <div className="mb-4 pr-1">
          <Tabs
            selectedKey={activeTier}
            onSelectionChange={(k) => {
              const tier = k as TierKey;

              // user action: allow autofill
              skipAutofillOnceRef.current = false;

              // clear only itemIds; keep disabled flags
              setSelectedBySlotKey((prev) => {
                const next: SelectedBySlotKey = { ...prev };
                for (const key of Object.keys(next)) {
                  next[key] = { ...ensureState(next[key]), itemId: null };
                }
                return next;
              });

              setActiveTier(tier);
            }}
            variant="underlined"
            color="primary"
            className="w-full border-b-1 border-gray-300 bg-transparent "
            classNames={{
              tabList: "flex w-full ",
              tab: "h-[34px] flex-1 justify-center",
              tabContent: "flex items-center justify-center text-default-700",
            }}
          >
            {TIER_KEYS.map((k) => (
              <Tab key={k} title={t(`items/tiers:${k}.name`)} />
            ))}
          </Tabs>
        </div>

        <div className="flex gap-4">
          <Card className="h-[726px] w-[220px] shrink-0 bg-crafting-equipment-view border-x-1 border-primary rounded-lg" shadow="none">
            <CardBody className="h-full overflow-y-auto">
              {loading ? (
                <div className="text-sm text-default-500">Loading...</div>
              ) : (
                <EquipmentsView
                  selectedBySlotKey={selectedBySlotKey}
                  setSelectedBySlotKey={setSelectedBySlotKey}
                />
              )}
            </CardBody>
          </Card>

          <Card className="h-[726px] w-full min-w-0 bg-transparent " shadow="none">
            <CardBody className="h-full min-h-0 py-0 px-1">
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
