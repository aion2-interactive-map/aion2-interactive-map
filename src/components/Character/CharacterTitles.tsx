import React from "react";
import {useCharacter} from "@/context/CharacterContext.tsx";
import {getStaticUrl} from "@/utils/url.ts";

const CharacterTitles: React.FC = () => {
  const {info} = useCharacter();

  if (!info) return null;

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

export default React.memo(CharacterTitles);
