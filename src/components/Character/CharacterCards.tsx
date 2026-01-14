import React from "react";
import {useCharacter} from "@/context/CharacterContext.tsx";
import {getStaticUrl} from "@/utils/url.ts";
import {useTranslation} from "react-i18next";
import {keyBy} from "lodash";
import {useItemData} from "@/context/ItemDataContext.tsx";

const CharacterCards: React.FC = () => {
  const {equipments} = useCharacter();
  const {itemsById} = useItemData();
  const {t} = useTranslation();

  const equipmentBySlotPos = keyBy(equipments?.equipments ?? [], "slotPos");
  const cardSlots = [41, 42, 43, 44, 45] as const;

  return (
    <div className="flex w-full justify-between gap-4">
      {cardSlots.map((slotPos) => {
        const eq = equipmentBySlotPos[slotPos];
        const item = eq ? itemsById.get(eq.id) : null;
        const icon = getStaticUrl(item?.icon || "");
        const itemName = t(`items/items:${eq?.id}.name`, String(eq?.id ?? ""));

        return (
          <div
            key={slotPos}
            className="relative flex justify-center items-start"
            style={{height: "80px", width: "80px"}}
            title={itemName}
          >
            {eq ? (
              <>
                <img
                  src={icon}
                  alt={itemName}
                  className="object-contain rounded-lg"
                  style={{width: "80px", height: "80px"}}
                  draggable={false}
                />
                <div
                  className="absolute left-1/2 -translate-x-1/2 bottom-[4px] text-white bg-black/60 px-2 rounded-lg text-[14px] font-bold pointer-events-none"
                >
                  +{eq?.enchantLevel ?? 0}
                </div>
              </>
            ) : (
              <div className="bg-default-800 rounded-lg w-full h-full"/>
            )}

          </div>
        );
      })}
    </div>
  );
};

export default React.memo(CharacterCards);
