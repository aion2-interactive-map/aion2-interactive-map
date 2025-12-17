export type SelectedEquipmentState = {
  itemId: number | null;
  disabled: boolean;
};

export type SelectedBySlotKey = Record<string, SelectedEquipmentState | undefined>;
