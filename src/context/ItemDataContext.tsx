import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useYamlLoader } from "@/hooks/useYamlLoader";
import type {
  ClassMeta,
  RawClassesFile,
  ItemMeta,
  RawItemsFile,
  ItemTypeCategory,
  RawItemTypesFile,
  GradeMeta,
  RawGradesFile,
  CraftingEntry,
  RawCraftingFile,
  EquipmentSlot,
  RawSlotsFile, TierMeta, RawTiersFile,
} from "@/types/game";


export type ItemDataContextValue = {
  classes: ClassMeta[];
  items: ItemMeta[];
  types: ItemTypeCategory[];
  grades: GradeMeta[];
  crafting: CraftingEntry[];
  slots: EquipmentSlot[];
  tiers: TierMeta[];

  itemsById: Map<number, ItemMeta>;
  craftingById: Map<number, CraftingEntry>;
  slotsByKey: Map<string, EquipmentSlot>;
  gradesByName: Map<string, GradeMeta>;
  craftingItemIdsByType: Map<string, number[]>;
  subtypeToCategory: Map<string, string>;
  tiersByName: Map<string, TierMeta>;
  tierNameByItemId: Map<number, string>;

  loading: boolean;
};

const ItemDataContext = createContext<ItemDataContextValue | null>(null);

type ItemDataProviderProps = {
  children: React.ReactNode;
};

export const ItemDataProvider: React.FC<ItemDataProviderProps> = ({ children }) => {
  const [classes, setClasses] = useState<ClassMeta[]>([]);
  const [items, setItems] = useState<ItemMeta[]>([]);
  const [types, setTypes] = useState<ItemTypeCategory[]>([]);
  const [grades, setGrades] = useState<GradeMeta[]>([]);
  const [crafting, setCrafting] = useState<CraftingEntry[]>([]);
  const [slots, setSlots] = useState<EquipmentSlot[]>([]);
  const [tiers, setTiers] = useState<TierMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const loadYaml = useYamlLoader();
  // const hasLoadedRef = React.useRef(false);

  useEffect(() => {
    // if (hasLoadedRef.current) return;
    // hasLoadedRef.current = true;

    let cancelled = false;

    async function load() {
      try {
        const [
          classesData,
          itemsData,
          typesData,
          gradesData,
          craftingData,
          slotsData,
          tiersData,
        ] = await Promise.all([
          loadYaml<RawClassesFile>("data/classes.yaml"),
          loadYaml<RawItemsFile>("data/items/items.yaml"),
          loadYaml<RawItemTypesFile>("data/items/types.yaml"),
          loadYaml<RawGradesFile>("data/items/grades.yaml"),
          loadYaml<RawCraftingFile>("data/items/crafting.yaml"),
          loadYaml<RawSlotsFile>("data/items/slots.yaml"),
          loadYaml<RawTiersFile>("data/items/tiers.yaml"),
        ]);

        if (cancelled) return;

        setClasses(classesData.classes ?? []);
        setItems(itemsData.items ?? []);
        setTypes(typesData.categories ?? []);
        setGrades(gradesData.grades ?? []);
        setCrafting(craftingData.crafting ?? []);
        setSlots(slotsData.slots ?? []);
        setTiers(tiersData.tiers ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [loadYaml]);

  const itemsById = useMemo(() => {
    const m = new Map<number, ItemMeta>();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);

  const craftingById = useMemo(() => {
    const m = new Map<number, CraftingEntry>();
    for (const r of crafting) m.set(r.id, r);
    return m;
  }, [crafting]);

  const slotsByKey = useMemo(() => {
    const m = new Map<string, EquipmentSlot>();
    for (const s of slots) m.set(s.key, s);
    return m;
  }, [slots]);

  const gradesByName = useMemo(() => {
    const m = new Map<string, GradeMeta>();
    for (const g of grades) m.set(g.name, g);
    return m;
  }, [grades]);

  const craftingItemIdsByType = useMemo(() => {
    const m = new Map<string, number[]>();

    for (const entry of crafting) {
      const item = itemsById.get(entry.id);
      if (!item) continue;

      const type = item.subtype;
      if (!m.has(type)) m.set(type, []);
      m.get(type)!.push(entry.id);
    }

    // Optional: stable ordering
    for (const ids of m.values()) {
      ids.sort((a, b) => a - b);
    }

    return m;
  }, [crafting, itemsById]);

  const subtypeToCategory = useMemo(() => {
    const m = new Map<string, string>();

    for (const cat of types) {
      // Depending on your schema, subtypes may be in `cat.subtypes`
      for (const st of cat.subtypes ?? []) {
        // st.name is the subtype string like "Sword", "Helmet", etc.
        m.set(st.name, cat.name);
      }
    }

    return m;
  }, [types]);

  const tiersByName = useMemo(() => {
    const m = new Map<string, TierMeta>();
    for (const t of tiers) m.set(t.name, t);
    return m;
  }, [tiers]);

  // itemId -> tierName (first match wins; later duplicates ignored)
  const tierNameByItemId = useMemo(() => {
    const m = new Map<number, string>();
    for (const tier of tiers) {
      for (const id of tier.items ?? []) {
        if (!m.has(id)) m.set(id, tier.name);
      }
    }
    return m;
  }, [tiers]);

  return (
    <ItemDataContext.Provider
      value={{
        classes,
        items,
        types,
        grades,
        crafting,
        slots,
        tiers,
        itemsById,
        craftingById,
        slotsByKey,
        gradesByName,
        craftingItemIdsByType,
        subtypeToCategory,
        tiersByName,
        tierNameByItemId,
        loading,
      }}
    >
      {children}
    </ItemDataContext.Provider>
  );
};

export function useItemData(): ItemDataContextValue {
  const ctx = useContext(ItemDataContext);
  if (!ctx) {
    throw new Error("useItemData must be used inside <ItemDataProvider>");
  }
  return ctx;
}
