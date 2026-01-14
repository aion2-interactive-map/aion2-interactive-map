import {Accordion, AccordionItem, Spinner} from "@heroui/react";
import {useCharacter} from "@/context/CharacterContext.tsx";
import CharacterProfileCard from "./CharacterProfileCard.tsx";
import CharacterStats from "./CharacterStats.tsx";
import CharacterSkills from "./CharacterSkills.tsx";
import CharacterEquipments from "./CharacterEquipments.tsx";
import CharacterCards from "./CharacterCards.tsx";
import CharacterTitles from "./CharacterTitles.tsx";

export default function CharacterDetail() {
  const {info, loading, error, characterId, stats} = useCharacter();

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
    title: "text-[16px] leading-[16px] font-bold",
    content: "py-0",
    indicator: "text-default-700",
  };

  return (
    <div className="w-full space-y-4">
      <CharacterProfileCard />

      <div className="grid grid-cols-2 gap-4 w-full">
        <div className="w-full">
          <Accordion
            variant="light"
            selectionMode="multiple"
            defaultExpandedKeys={["stats", "skills"]}
            itemClasses={accordionItemClasses}
            showDivider={false}
            className="w-full"
          >
            <AccordionItem key="stats" title="主要能力值" className="w-full">
              <CharacterStats />
            </AccordionItem>

            <AccordionItem key="skills" title="技能" className="w-full">
              <CharacterSkills />
            </AccordionItem>
          </Accordion>
        </div>

        <div className="w-full">
          <Accordion
            variant="light"
            selectionMode="multiple"
            defaultExpandedKeys={["equipments", "titles", "cards"]}
            itemClasses={accordionItemClasses}
            showDivider={false}
            className="w-full"
          >
            <AccordionItem key="equipments" title="装备" className="w-full">
              <CharacterEquipments />
            </AccordionItem>
            <AccordionItem key="cards" title="阿尔卡那" className="w-full">
              <CharacterCards />
            </AccordionItem>
            <AccordionItem key="titles" title="称号" className="w-full">
              <CharacterTitles />
            </AccordionItem>
          </Accordion>
        </div>
      </div>

    </div>
  );
}
