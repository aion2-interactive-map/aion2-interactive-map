export type SelectedEquipmentState = {
  itemId: number | null;
  count: number;
};

export type SelectedBySlotKey = Record<string, SelectedEquipmentState | undefined>;
