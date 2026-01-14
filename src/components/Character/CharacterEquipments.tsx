import React from "react";
import {Tooltip, Spinner, Progress} from "@heroui/react";
import {useCharacter} from "@/context/CharacterContext.tsx";
import {getStaticUrl} from "@/utils/url.ts";
import {useTranslation} from "react-i18next";
import {keyBy, lowerCase} from "lodash";
import {useItemData} from "@/context/ItemDataContext.tsx";

const leftSlots = [1, 2, 3, 4, 5, 17, 6, 7, 8, 19] as const;
const rightSlots = [11, 12, 10, 22, 13, 14, 15, 16, 23, 24] as const;
type SlotPos = (typeof leftSlots)[number] | (typeof rightSlots)[number];

const CharacterEquipments: React.FC = () => {
  const {equipments, equipmentDetails} = useCharacter();
  const {itemsById} = useItemData();
  const {t} = useTranslation();

  const equipmentBySlotPos = keyBy(equipments?.equipments ?? [], "slotPos");

  const renderExceedLevel = (exceedLevel: number) => {
    if (exceedLevel === 0) return <div className="h-[16px] w-[16px] shrink-0"/>;
    return (
      <div className="mt-2 flex items-center justify-start gap-0">
        {Array.from({length: 5}).map((_, i) => (
          <div
            key={i}
            className="h-[16px] w-[16px] overflow-hidden rounded-sm flex justify-center items-center"
          >
            {i < exceedLevel && (
              <img
                src={getStaticUrl(
                  "UI/Resource/Texture/Icon/UT_NP_QuestMonolith_Acquired.webp"
                )}
                alt="exceed-level"
                className="h-full w-full object-contain"
                style={{
                  objectFit: "contain",
                  objectPosition: "0% 50%",
                  transform: "scale(3)",
                }}
                draggable={false}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderEquipmentCell = (slotPos: SlotPos) => {
    const eq = equipmentBySlotPos[slotPos];
    const detail = equipmentDetails?.[`equipments:${slotPos}`];
    const item = (eq ? itemsById.get(eq.id) : null) || (detail ? itemsById.get(detail.id) : null);

    const gradeName = item?.grade ?? "Common";
    const gradeBackground = getStaticUrl(
      `UI/Resource/Texture/ETC/UT_ItemTooltipGrade_${gradeName}.webp`
    );

    const imgSrc = getStaticUrl(item?.icon || "");
    const itemName = t(`items/items:${item?.id || eq?.id}.name`, String(item?.id || eq?.id || ""));

    // console.log(itemName);
    // console.log(detail);

    const tooltipContent = detail ? (
      <div className="space-y-2 w-full text-[14px]">
        <div className="font-bold text-[18px] text-center pb-1">装备详情</div>
        <div
          className="p-2 rounded flex justify-between items-center bg-contain bg-center bg-no-repeat"
          style={{backgroundImage: `url(${gradeBackground})`, backgroundSize: "100% 100%"}}
        >
          <div className="flex flex-col justify-between h-full">
            <div className={`mb-1 text-[18px] font-bold text-stroke text-grade-${lowerCase(item?.grade || "Common")}`}>
              {eq?.enchantLevel ? `+${eq.enchantLevel} ` : ""}{itemName}
            </div>
            <div className="text-[14px]">
              <span className={`font-bold text-stroke text-grade-${lowerCase(item?.grade || "Common")}`}>{t(`items/grades:${item?.grade}.name`)}</span>
              <span className="font-bold text-background">{t(`items/types:subtypes.${item?.subtype}.name`)}</span>
            </div>
            <div className="text-[14px] font-bold text-background">道具等级</div>
            <div className="text-[14px] font-bold text-background">
              {detail.level} (+{detail.levelValue})
            </div>
          </div>
          <div className="flex flex-col items-center">
            <img src={imgSrc} alt={itemName} className="w-16 h-16 object-contain"/>
            {renderExceedLevel(eq?.exceedLevel || 0)}
          </div>
        </div>
        {detail.mainStats && detail.mainStats.length > 0 && (
          <div className="bg-character-card p-2 rounded space-y-1">
            {detail.mainStats.map((s, i) => (
              <div key={`${s.id}-${i}`} className="flex justify-between">
                  <span
                    className={`${s.exceed ? "text-grade-epic" : "text-default-800"} font-[700]`}>{t(`stats:${s.id}.name`, s.id)}</span>
                <span className="text-foreground font-[700]">
                    {!s.exceed && (
                      s.minValue && s.minValue !== "" ? `${s.minValue} - ${s.value}` : s.value
                    )}
                  {
                    s.extra !== "0" && s.extra !== "0%" && (
                      !s.exceed ? <span className="text-grade-rare ml-1">(+{s.extra})</span> :
                        <span className="text-grade-epic ml-1">{s.extra}</span>
                    )
                  }
                  </span>
              </div>
            ))}
          </div>
        )}
        {((detail.subStats && detail.subStats.length > 0) || (detail.subSkills && detail.subSkills.length > 0)) && (
          <div className="bg-character-card p-2 rounded space-y-1">
            <Progress
              aria-label="Loading..."
              color="primary"
              value={Number(detail.soulBindRate)}
              label="灵魂刻印率"
              valueLabel={`${detail.soulBindRate}%`}
              showValueLabel={true}
              classNames={{
                label: "text-[14px] text-default-800 font-[700]",
                value: "text-[14px] text-foreground font-[700]",
                base: "gap-0.5"
              }}
              size="sm"
            />
            {detail.subStats && detail.subStats.map((s, i) => (
              <div key={`${s.id}-${i}`} className="flex justify-between">
                <span className="text-default-800 font-[700]">{t(`stats:${s.id}.name`, s.id)}</span>
                <span className="text-foreground font-[700]">{s.value}</span>
              </div>
            ))}
            {detail.subSkills && detail.subSkills.map((s, i) => (
              <div key={`${s.id}-${i}`} className="flex justify-between items-center">
                <span className="text-default-800 font-[700]">{t(`skills:${s.id}.name`, String(s.id))}</span>
                <span className="text-foreground font-[700]">Lv.+{s.level}</span>
              </div>
            ))}
          </div>
        )}
        {detail.magicStoneStat?.length > 0 && (
          <div className="pt-1">
            <div className="bg-character-card p-2 rounded grid grid-cols-2 gap-x-4 gap-y-1">
              {detail.magicStoneStat.map((s, i) => (
                <div key={i} className={`flex justify-between text-grade-${lowerCase(s.grade)}`}>
                  <span className="font-[700] whitespace-nowrap">{t(`stats:${s.id}.name`, s.id)}</span>
                  <span className="font-[700]">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {detail.godStoneStat?.length > 0 && (
          <div className="pt-1 space-y-1">
            {/*<div className="text-[10px] uppercase text-default-400 mb-1 px-2">God Stones</div>*/}
            <div className="bg-character-card p-2 rounded space-y-1">
              {detail.godStoneStat.map((s, i) => (
                <div key={i} className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className={`text-grade-${lowerCase(s.grade)} font-[700]`}>{s.name}</span>
                    {/*<span className={`text-foreground font-[700] text-grade-${lowerCase(s.grade)}`}>{t(`common:grades.${s.grade}`, s.grade)}</span>*/}
                  </div>
                  <div className="text-default-800 text-[12px] mt-1">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ) : (
      <div className="flex justify-center items-center py-2">
        <Spinner size="sm"/>
      </div>
    );

    return (
      <Tooltip
        content={tooltipContent} placement="left" key={slotPos}
        classNames={{
          content: "bg-character-equipment rounded-lg shadow-none px-2 py-4 w-[330px]",
        }}
      >
        <div
          className="relative h-[56px] bg-contain bg-center bg-no-repeat rounded-[4px] shadow-none cursor-help"
          style={{backgroundImage: `url(${gradeBackground})`, backgroundSize: "100% 100%"}}
        >
          <div className="flex h-full w-full items-center rounded-[4px] px-2">
            {eq || detail ? (
              <img
                src={imgSrc}
                alt={itemName}
                className="h-12 w-12 shrink-0 object-contain"
                draggable={false}
              />
            ) : (
              <div className="h-12 w-12 shrink-0"/>
            )}

            <div className="ml-2 flex h-[48px] min-w-0 flex-1 flex-col justify-center">
              <div
                className="truncate text-left text-[13px] font-bold leading-[13px] text-white [text-shadow:0px_2px_4px_rgba(0,0,0,0.35)]">
                {(eq || detail) &&
                  `${itemName} +${eq?.enchantLevel ?? detail?.enchantLevel ?? 0}`}
              </div>
              {renderExceedLevel(eq?.exceedLevel || 0)}
            </div>
          </div>
        </div>
      </Tooltip>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-3">
        {leftSlots.map((slotPos) => renderEquipmentCell(slotPos))}
      </div>
      <div className="flex flex-col gap-3">
        {rightSlots.map((slotPos) => renderEquipmentCell(slotPos))}
      </div>
    </div>
  );
};

export default React.memo(CharacterEquipments);
