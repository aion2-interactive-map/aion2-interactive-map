import React from "react";
import {useCharacter} from "@/context/CharacterContext.tsx";
import {getStaticUrl} from "@/utils/url.ts";
import {useTranslation} from "react-i18next";
import {AdaptiveTooltip} from "@/components/AdaptiveTooltip.tsx";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faLock} from "@fortawesome/free-solid-svg-icons";

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
            className="w-[18px] text-center text-lg font-semibold text-default-700 break-words"
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
              <AdaptiveTooltip
                key={String(s.id)}
                content={
                  <div className="px-1 py-1">
                    <div className="text-small font-bold">{t(`skills:${s.id}.name`, String(s.id))}</div>
                    <div className="text-tiny">
                      {s.skillLevel === 0 ? "未解锁" : `Lv.${s.skillLevel}`}
                    </div>
                  </div>
                }
                placement="top"
                radius="sm"
                delay={0}
                closeDelay={0}
              >
                <div
                  className="relative h-12 w-12 overflow-hidden rounded-md cursor-help outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  tabIndex={0}
                >
                  {icon ? (
                    <img
                      src={icon}
                      alt={String(s.id)}
                      className={`h-full w-full object-cover ${s.skillLevel === 0 ? "grayscale brightness-50" : ""}`}
                      draggable={false}
                    />
                  ) : (
                    <div className="h-full w-full bg-default-200"/>
                  )}

                  {s.skillLevel === 0 ? (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white/80">
                      <FontAwesomeIcon icon={faLock} />
                    </div>
                  ) : (
                    /* Skill level badge */
                    <div className="absolute bottom-0 right-0 bg-black/60 text-white text-sm px-1 rounded-tl-md">
                      LV{s.skillLevel}
                    </div>
                  )}
                </div>
              </AdaptiveTooltip>
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
