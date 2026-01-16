import React from "react";
import {useCharacter} from "@/context/CharacterContext.tsx";
import {getStaticUrl} from "@/utils/url.ts";
import {useTranslation} from "react-i18next";
import {keyBy, lowerCase} from "lodash";
import {useItemData} from "@/context/ItemDataContext.tsx";
import {AdaptiveTooltip} from "@/components/AdaptiveTooltip.tsx";
import {Spinner} from "@heroui/react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faLock} from "@fortawesome/free-solid-svg-icons";

const CharacterCards: React.FC = () => {
  const {equipments, equipmentDetails} = useCharacter();
  const {itemsById} = useItemData();
  const {t} = useTranslation();

  const equipmentBySlotPos = keyBy(equipments?.equipments ?? [], "slotPos");
  const cardSlots = [41, 42, 43, 44, 45] as const;

  return (
    <div className="grid grid-cols-5 w-full gap-2 sm:gap-4 justify-items-center">
      {cardSlots.map((slotPos) => {
        const eq = equipmentBySlotPos[slotPos];
        const detail = equipmentDetails?.[`equipments:${slotPos}`];
        const item = (eq ? itemsById.get(eq.id) : null) || (detail ? itemsById.get(detail.id) : null);
        const icon = getStaticUrl(item?.icon || "");
        const itemName = t(`items/items:${item?.id || eq?.id}.name`, String(item?.id || eq?.id || ""));

        const gradeName = item?.grade ?? "Common";
        const gradeBackground = getStaticUrl(
          `UI/Resource/Texture/ETC/UT_ItemTooltipGrade_${gradeName}.webp`
        );

        const tooltipContent = detail ? (
          <div className="space-y-2 w-full text-[14px]">
            <div className="font-bold text-[18px] text-center pb-1">装备详情</div>
            <div
              className="p-2 rounded flex justify-between items-center bg-contain bg-center bg-no-repeat"
              style={{backgroundImage: `url(${gradeBackground})`, backgroundSize: "100% 100%"}}
            >
              <div className="flex flex-col justify-between h-full">
                <div
                  className={`mb-1 text-[18px] font-bold text-stroke text-grade-${lowerCase(item?.grade || "Common")}`}>
                  {eq?.enchantLevel ? `+${eq.enchantLevel} ` : ""}{itemName}
                </div>
                <div className="text-[14px]">
                  <span
                    className={`font-bold text-stroke text-grade-${lowerCase(item?.grade || "Common")}`}>{t(`items/grades:${item?.grade}.name`)}</span>
                  {/*<span className="font-bold text-background">{t(`items/types:subtypes.${item?.subtype}.name`)}</span>*/}
                </div>
                <div className="text-[14px] font-bold text-background">道具等级</div>
                <div className="text-[14px] font-bold text-background">
                  {detail.level} (+{detail.levelValue})
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="relative">
                  <img src={icon} alt={itemName} className="w-16 h-16 object-contain"/>
                </div>
              </div>
            </div>
            <div className="bg-character-card p-2 rounded space-y-1">
              {detail.mainStats && detail.mainStats.length > 0 && (
                detail.mainStats.map((s, i) => (
                  <div key={`${s.id}-${i}`} className="flex justify-between">
                    <span className={`${s.exceed ? "text-grade-epic" : "text-default-800"} font-[700]`}>
                      {t(`stats:${s.id}.name`, s.id)}
                    </span>
                    <span className="text-foreground font-[700]">
                      {!s.exceed && (
                        s.minValue && s.minValue !== "" ? `${s.minValue} - ${s.value}` : s.value
                      )}
                      {s.extra !== "0" && s.extra !== "0%" && (
                        !s.exceed ? <span className="text-grade-rare ml-1">(+{s.extra})</span> :
                          <span className="text-grade-epic ml-1">{s.extra}</span>
                      )}
                    </span>
                  </div>
                ))
              )}
              {detail.subSkills && detail.subSkills.length > 0 && (
                detail.subSkills.map((s, i) => (
                  <div key={`${s.id}-${i}`} className="flex justify-between items-center">
                    <span className="text-default-800 font-[700]">{t(`skills:${s.id}.name`, String(s.id))}</span>
                    <span className="text-foreground font-[700]">Lv.+{s.level}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center py-2">
            <Spinner size="sm"/>
          </div>
        );

        return (
          <AdaptiveTooltip
            key={slotPos}
            content={tooltipContent}
            isDisabled={!eq}
            placement="top"
            classNames={{
              content: "bg-character-equipment rounded-lg shadow-none px-2 py-4 w-[330px] max-w-[calc(100vw-32px)]",
            }}
            delay={0}
            closeDelay={0}
          >
            <div
              className="relative flex justify-center items-start cursor-help outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg w-full max-w-24 aspect-square"
              tabIndex={0}
            >
              {eq ? (
                <>
                  <img
                    src={icon}
                    alt={itemName}
                    className="object-contain rounded-lg w-full h-full"
                    draggable={false}
                  />
                  <div
                    className="absolute left-1/2 -translate-x-1/2 bottom-[4px] text-white bg-black/60 px-2 rounded-lg text-[14px] font-bold pointer-events-none"
                  >
                    +{eq?.enchantLevel ?? 0}
                  </div>
                </>
              ) : (
                <div className="bg-default-800 rounded-lg w-full h-full relative">
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white/80 rounded-lg">
                    <FontAwesomeIcon icon={faLock} size="xl" />
                  </div>
                </div>
              )}
            </div>
          </AdaptiveTooltip>
        );
      })}
    </div>
  );
};

export default React.memo(CharacterCards);
