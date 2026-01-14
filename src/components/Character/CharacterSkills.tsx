import React from "react";
import {useCharacter} from "@/context/CharacterContext.tsx";
import {getStaticUrl} from "@/utils/url.ts";
import {useTranslation} from "react-i18next";

const CharacterSkills: React.FC = () => {
  const {equipments, skillsById} = useCharacter();
  const {t} = useTranslation();

  const renderSkillRow = (category: "Active" | "Passive" | "Dp") => {
    const list =
      (equipments?.skills ?? []).filter((s) => {
        const meta = skillsById.get(s.id);
        return meta?.category === category;
      }) ?? [];

    return (
      <div className="flex gap-0 border-1 border-crafting-border bg-character-card rounded-lg">
        <div
          className="w-[38px] shrink-0 flex items-center justify-center border-r-1 border-crafting-border">
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

  return (
    <div className="space-y-4">
      {renderSkillRow("Active")}
      {renderSkillRow("Passive")}
      {renderSkillRow("Dp")}
    </div>
  );
};

export default React.memo(CharacterSkills);
