export type SelectedEquipmentState = {
  itemId: number | null;
  count: number;
};

export type SelectedBySlotKey = Record<string, SelectedEquipmentState | undefined>;

export type MaterialRow = {
  id: number;
  count: number; // Required count (N)
  children?: MaterialRow[];
};
