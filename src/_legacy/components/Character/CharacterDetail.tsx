import {Accordion, AccordionItem, Spinner} from "@heroui/react";
import {useCharacter} from "@/context/CharacterContext.tsx";
import {useBoardData} from "@/context/BoardDataContext.tsx";
import {useDetectedClass} from "@/hooks/useDetectedClass.ts";
import {useEffect} from "react";
import CharacterProfileCard from "./CharacterProfileCard.tsx";
import CharacterStats from "./CharacterStats.tsx";
import CharacterSkills from "./CharacterSkills.tsx";
import CharacterRankings from "./CharacterRankings.tsx";
import CharacterEquipments from "./CharacterEquipments.tsx";
import CharacterCards from "./CharacterCards.tsx";
import CharacterTitles from "./CharacterTitles.tsx";
import CharacterBoards from "./CharacterBoards.tsx";
import {useIsMobile} from "@/hooks/useIsMobile.ts";

export default function CharacterDetail() {
  const {info, loading, error, characterId, stats} = useCharacter();
  const {loadBoardsForClass} = useBoardData();
  const detectedClassName = useDetectedClass();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (detectedClassName) {
      loadBoardsForClass(detectedClassName);
    }
  }, [detectedClassName, loadBoardsForClass]);

  if (!characterId) {
    return null;
  }

  if (error) {
    return (
      <div className="grid place-items-center py-20 text-default-500">
        <div className="rounded-lg border border-default-200 bg-content2 px-6 py-3 text-sm">
          Error loading character: {error}
        </div>
      </div>
    );
  }

  if (loading || !info) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner/>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const accordionItemClasses = {
    base: "!bg-transparent !shadow-none !backdrop-filter-none !backdrop-blur-none pb-2 ",
    trigger: "py-4 min-h-0 px-2",
    title: "text-base leading-[16px] font-bold",
    content: "py-0",
    indicator: "text-default-700",
  };

  const allItems = [
    { key: "equipments", title: "装备", component: <CharacterEquipments /> },
    { key: "cards", title: "阿尔卡那", component: <CharacterCards /> },
    { key: "stats", title: "主要能力值", component: <CharacterStats /> },
    { key: "boards", title: "守护力", component: <CharacterBoards /> },
    { key: "skills", title: "技能", component: <CharacterSkills /> },
    { key: "titles", title: "称号", component: <CharacterTitles /> },
    { key: "rankings", title: "排名", component: <CharacterRankings /> },
  ];

  const desktopLeftKeys = ["stats", "skills", "rankings"];
  const desktopRightKeys = ["equipments", "cards", "boards", "titles"];

  const renderAccordion = (items: typeof allItems, className?: string) => (
    <Accordion
      variant="light"
      selectionMode="multiple"
      defaultExpandedKeys={items.map(i => i.key)}
      itemClasses={accordionItemClasses}
      showDivider={false}
      className={className}
    >
      {items.map((item) => (
        <AccordionItem key={item.key} title={item.title} className="w-full">
          {item.component}
        </AccordionItem>
      ))}
    </Accordion>
  );

  return (
    <div className="w-full space-y-4">
      <CharacterProfileCard />

      {isMobile ? (
        /* Mobile view: single column, interleaved order */
        <div>
          {renderAccordion(allItems)}
        </div>
      ) : (
        /* Desktop view: two columns, independent */
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            {renderAccordion(allItems.filter((item) => desktopLeftKeys.includes(item.key)))}
          </div>
          <div className="flex flex-col">
            {renderAccordion(allItems.filter((item) => desktopRightKeys.includes(item.key)))}
          </div>
        </div>
      )}
    </div>
  );
}
