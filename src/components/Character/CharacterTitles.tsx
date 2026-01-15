import React from "react";
import {useCharacter} from "@/context/CharacterContext.tsx";
import {getStaticUrl} from "@/utils/url.ts";
import {Card, CardBody, CardHeader} from "@heroui/react";
import {lowerCase} from "lodash";
import {useTranslation} from "react-i18next";

const CharacterTitles: React.FC = () => {
  const {info} = useCharacter();
  const {t} = useTranslation();

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
        const title = info.titles?.find((x) => x.equipCategory === cat);
        const icon = getStaticUrl(`UI/Resource/Texture/ETC/${icons[i]}`);

        return (
          <Card key={cat} className="shadow-none bg-character-card border-1 border-crafting-border rounded-lg overflow-hidden">
            <CardHeader className="flex gap-3 p-3 bg-character-input border-b-1 border-crafting-border">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-foreground p-1 flex items-center justify-center">
                <img
                  src={icon}
                  alt={cat}
                  draggable={false}
                  className="h-full w-full object-contain scale-125"
                />
              </div>
              <div className="flex flex-col gap-0.5 text-[14px]">
                <p className="text-default-800">{t(`common:titles.${cat}`, cat)}</p>
                <p className="text-default-700">
                  <span className="text-foreground font-bold">{title?.ownedCount ?? 0}</span> / {title?.totalCount ?? 0}
                </p>
              </div>
            </CardHeader>
            <CardBody className="p-3">
              <div className={`text-[15px] font-bold mb-1 text-grade-${lowerCase(title?.grade || "Common")}`}>
                {title?.name || "尚未装备"}
              </div>
              <div className="space-y-0.5">
                {title?.equipStats && title?.equipStats.map((stat, index) => (
                  <div key={index} className="text-[13px] text-default-800">
                    {stat}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
};

export default React.memo(CharacterTitles);
