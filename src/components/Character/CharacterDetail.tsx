import {Accordion, AccordionItem, Card, CardBody, Spinner} from "@heroui/react";
import {useCharacter} from "@/context/CharacterContext.tsx";
import {getStaticUrl} from "@/utils/url.ts";
import {useTranslation} from "react-i18next";
import {keyBy, lowerCase} from "lodash";
import moment from 'moment';
import {useItemData} from "@/context/ItemDataContext.tsx";

export default function CharacterDetail() {
  const {info, loading, error, characterId, stats, skillsById} = useCharacter();
  const {itemsById} = useItemData();
  const {t, i18n} = useTranslation();

  if (error) {
    return (
      <div className="grid place-items-center py-20 text-default-500">
        <div className="rounded-lg border border-default-200 bg-content2 px-6 py-3 text-sm">
          Error loading character: {error}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner/>
      </div>
    );
  }

  if (!info || !stats) {
    return null;
  }

  const accordionItemClasses = {
    base: "!bg-transparent !shadow-none !backdrop-filter-none !backdrop-blur-none pb-2 ",
    trigger: "py-4 min-h-0 px-2",
    title: "text-[16px] leading-[16px] font-bold",
    content: "py-0",
    indicator: "text-default-700",
  };

  const infoStatsDict = keyBy(info.stats, "type");

  // Reusable function to render stat grids (mainStats and lordStats)
  const renderStatGrid = (statsType: "mainStats" | "lordStats") => {
    const currentStats = stats[statsType];
    return (
      <div className="grid grid-cols-6 gap-4">
        {currentStats?.map((stat, index) => (
          <div
            key={index}
            className="text-center bg-character-input rounded-md border-1 border-crafting-border p-2"
          >
            <div className="h-[60px] w-[60px] mx-auto rounded-lg">
              <img
                src={getStaticUrl(stat.icon)}
                alt={stat.type}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
            <div className="text-[18px] text-default-800">
              {t(`stats:${statsType}.${stat.type}.name`)}
            </div>
            <div className="text-[18px] text-default-800">
              {infoStatsDict[stat.type]?.value ?? "-"}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // --- Skills rendering (Active / Passive / Dp) ---
  // Note: info.skills is the API list (id/skillLevel/acquired/equip) and has NO category.
  // Category comes from skillsById (YAML meta), so we join by id.
  const renderSkillRow = (category: "Active" | "Passive" | "Dp") => {
    const list =
      (info.skills ?? []).filter((s) => {
        const meta = skillsById.get(s.id);
        return meta?.category === category;
      }) ?? [];

    return (
      <div className="flex gap-0 border-1 border-crafting-border rounded-lg">
        <div
          className="w-[38px] shrink-0 flex items-center justify-center bg-character-input border-r-1 border-crafting-border">
          <div
            className="w-[18px] text-center text-[18px] font-semibold text-default-700 break-words"
          >
            {t(`common:skills.category.${category.toLowerCase()}`, category)}
          </div>
        </div>


        <div className="flex flex-wrap gap-3 p-3">
          {list.map((s) => {
            const meta = skillsById.get(s.id);
            const icon = meta?.icon
              ? getStaticUrl(`UI/Resource/Texture/Skill/${meta.icon}`)
              : undefined;

            return (
              <div
                key={String(s.id)}
                className="relative h-[48px] w-[48px] overflow-hidden rounded-md"
              >
                {icon ? (
                  <img
                    src={icon}
                    alt={String(s.id)}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="h-full w-full bg-default-200"/>
                )}

                {/* Skill level badge */}
                <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[14px] px-1 rounded-tl-md">
                  LV{s.skillLevel}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTitlesGrid = () => {
    const categories = ["Attack", "Defense", "Etc"] as const;
    const icons = [
      "UT_Stat_GrowthSummary_Title_First.webp",
      "UT_Stat_GrowthSummary_Title_Second.webp",
      "UT_Stat_GrowthSummary_Title_Third.webp",
    ];

    return (
      <div className="grid grid-cols-3 gap-4">
        {categories.map((cat, i) => {
          const first = info.titles?.find((x) => x.equipCategory === cat);
          const gradeName = first?.grade ?? "Common";

          const bg = getStaticUrl(`UI/Resource/Texture/ETC/UT_SlotGrade_${gradeName}.webp`);
          const icon = getStaticUrl(`UI/Resource/Texture/ETC/${icons[i]}`);

          return (
            <div key={cat}
                 className="relative overflow-hidden rounded-md border-1 border-crafting-border bg-character-input p-3">
              <div className="absolute inset-0 bg-center bg-no-repeat bg-contain"
                   style={{backgroundImage: `url(${bg})`, backgroundSize: "100% 100%"}}/>
              <div className="relative flex flex-col items-center gap-2">
                <div className="h-[80px] w-[80px] overflow-hidden rounded-md">
                  <img src={icon} alt={cat} className="h-full w-full object-cover" draggable={false}/>
                </div>
                <div className="text-sm font-semibold text-white">{first?.name ?? ""}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const equipmentBySlotPos = keyBy(info.equipments ?? [], "slotPos");
  const leftSlots = [1, 2, 3, 4, 5, 17, 6, 7, 8, 19] as const;
  const rightSlots = [11, 12, 10, 22, 13, 14, 15, 16, 23, 24] as const;
  type SlotPos = (typeof leftSlots)[number] | (typeof rightSlots)[number];

  const renderEquipmentCell = (slotPos: SlotPos) => {
    const eq = equipmentBySlotPos[slotPos];
    const item = eq ? itemsById.get(eq.id) : null;

    const gradeName = item?.grade ?? "Common";
    const gradeBackground = getStaticUrl(
      `UI/Resource/Texture/ETC/UT_ItemTooltipGrade_${gradeName}.webp`
    );

    const imgSrc = getStaticUrl(item?.icon || "");

    const itemName = t(`items/items:${eq.id}.name`, String(eq.id))

    return (
      <div
        key={slotPos}
        className="relative h-[56px] bg-contain bg-center bg-no-repeat rounded-[4px] shadow-none"
        style={{backgroundImage: `url(${gradeBackground})`, backgroundSize: "100% 100%"}}
        title={itemName}
      >
        <div className="flex h-full w-full items-center rounded-[4px] px-2">
          <img
            src={imgSrc}
            alt={itemName}
            className="h-12 w-12 shrink-0 object-contain"
            draggable={false}
          />

          <div className="ml-2 flex h-[48px] min-w-0 flex-1 flex-col justify-center">
            <div
              className="truncate text-left text-[13px] font-bold leading-[13px] text-white [text-shadow:0px_2px_4px_rgba(0,0,0,0.35)]">
              {`${itemName} +${eq.enchantLevel}`}
            </div>
            <div className="mt-2 flex items-center justify-start gap-0">
              {eq?.exceedLevel
                ? Array.from({length: eq.exceedLevel}).map((_, i) => (
                  <div key={i}
                       className="h-[16px] w-[16px] overflow-hidden rounded-sm flex justify-center items-center">
                    <img
                      src={getStaticUrl("UI/Resource/Texture/Icon/UT_NP_QuestMonolith_Acquired.webp")}
                      alt="exceed-level"
                      className="h-full w-full object-contain"
                      style={{
                        objectFit: "contain",
                        objectPosition: "0% 50%", // align left + vertical centered
                        transform: "scale(3)",  // visually crop out large transparent padding
                      }}
                      draggable={false}
                    />
                  </div>
                ))
                : null}
              {(!eq?.exceedLevel || eq.exceedLevel === 0) && (
                <div className="h-[16px] w-[16px] shrink-0"/>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEquipmentsGrid = () => {
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

  const renderCardsGrid = () => {
    const equipmentBySlotPos = keyBy(info.equipments ?? [], "slotPos");
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
              {icon ? (
                <img
                  src={icon}
                  alt={itemName}
                  className="object-contain rounded-lg"
                  style={{width: "80px", height: "80px"}}
                  draggable={false}
                />
              ) : (
                <div className="bg-default-200 rounded-lg w-full h-full"/>
              )}

              <div
                className="absolute left-1/2 -translate-x-1/2 bottom-[4px] text-white bg-black/60 px-2 rounded-lg text-[14px] font-bold pointer-events-none"
              >
                +{eq?.enchantLevel ?? 0}
              </div>
            </div>
          );
        })}
      </div>
    );
  };


  return (
    <div className="w-full space-y-4">
      <Card className="shadow-none border-default-200 bg-character-input border-1 border-crafting-border rounded-lg">
        <CardBody className="flex flex-col items-center gap-2">
          <div
            className="w-[72px] h-[72px] rounded-full overflow-hidden bg-default-100 flex justify-center items-center">
            <img
              src={info.profile.profileImage}
              alt="avatar"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>

          <div className="w-full text-center text-default-800">
            <div className="text-[18px]">
              {info.profile.characterName} [<span
              className={`text-grade-${lowerCase(info.profile.titleGrade)}`}>{info.profile.titleName}</span>]
            </div>
            <div className="mt-2 text-[14px]">
              {info.profile.raceName} | {info.profile.serverName} | {info.profile.className} |{" "}
              {info.profile.regionName} | <span
              className="font-semibold">战力值{infoStatsDict["ItemLevel"]["value"]}</span> |
              更新于 {moment(info.updatedAt).locale(i18n.language.toLowerCase().split('-')[0]).fromNow()}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Accordion
            variant="light"
            selectionMode="multiple"
            defaultExpandedKeys={["stats", "skills"]}
            itemClasses={accordionItemClasses}
            showDivider={false}
          >
            <AccordionItem key="stats" title="主要能力值">
              <div className="mb-4">{renderStatGrid("mainStats")}</div>
              <div>{renderStatGrid("lordStats")}</div>
            </AccordionItem>

            <AccordionItem key="skills" title="技能">
              <div className="space-y-4">
                {renderSkillRow("Active")}
                {renderSkillRow("Passive")}
                {renderSkillRow("Dp")}
              </div>
            </AccordionItem>
          </Accordion>
        </div>

        <div>
          <Accordion
            variant="light"
            selectionMode="multiple"
            defaultExpandedKeys={["equipments", "titles", "cards"]}
            itemClasses={accordionItemClasses}
            showDivider={false}
          >
            <AccordionItem key="equipments" title="装备">
              {renderEquipmentsGrid()}
            </AccordionItem>
            <AccordionItem key="titles" title="称号">
              {renderTitlesGrid()}
            </AccordionItem>
            <AccordionItem key="cards" title="阿尔卡纳">
              {renderCardsGrid()}
            </AccordionItem>
          </Accordion>

        </div>
      </div>

      {!characterId && (
        <div className="grid place-items-center py-10 text-default-400 text-sm">
          No character selected.
        </div>
      )}
    </div>
  );
}
