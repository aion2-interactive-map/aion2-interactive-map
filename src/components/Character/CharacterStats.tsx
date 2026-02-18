import React, {useState} from "react";
import {useCharacter} from "@/context/CharacterContext.tsx";
import {getStaticUrl} from "@/utils/url.ts";
import {useTranslation} from "react-i18next";
import {keyBy} from "lodash";
import {Button, Card, CardBody, CardFooter, Divider} from "@heroui/react";
import {AdaptiveTooltip} from "@/components/AdaptiveTooltip.tsx";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faChevronDown, faChevronUp} from "@fortawesome/free-solid-svg-icons";

const CharacterStats: React.FC = () => {
  const {info, stats} = useCharacter();
  const {t} = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (!info || !stats) return null;

  const infoStatsDict = keyBy(info.stats, "type");

  const renderStatGrid = (statsType: "mainStats" | "lordStats") => {
    const currentStats = stats[statsType];
    return (
      <div className="grid grid-cols-6 gap-1 sm:gap-3">
        {currentStats?.map((stat, index) => {
          const mainStatValue = infoStatsDict[stat.type]?.value ?? 0;
          const secondStatValue = (mainStatValue * (statsType === "mainStats" ? 0.1 : 0.2)).toFixed(1);
          const mainStatName = t(`stats:${stat.type}.name`);
          const mainStatDescription = t(`stats:${stat.type}.description`, "");

          const tooltipContent = (
            <div className="px-1 py-1">
              <div className="flex justify-between items-center mb-1 gap-4">
                <span className="font-bold text-default-800">
                  {mainStatName}{mainStatDescription && `[${mainStatDescription}]`}
                </span>
                <span className="font-bold text-foreground">{infoStatsDict[stat.type]?.value ?? "-"}</span>
              </div>
              {stat.secondStats?.map((ss, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span className="text-default-800">{t(`stats:${ss.type}.name`)}</span>
                  <span className="font-bold">{ss.type === 'CooldownDecrease' || ss.type === 'MPCostDecrease' ? '-' : '+'}{secondStatValue}%</span>
                </div>
              ))}
            </div>
          );

          return (
            <AdaptiveTooltip
              key={index}
              content={tooltipContent}
              placement="top"
              radius="sm"
              delay={0}
              closeDelay={0}
            >
              <div
                className="text-center bg-character-card rounded-md border-1 border-crafting-border p-1 sm:p-2 cursor-help outline-none focus-visible:ring-2 focus-visible:ring-primary"
                tabIndex={0}
              >
                <div className="w-full max-w-[60px] aspect-square mx-auto rounded-lg overflow-hidden">
                  <img
                    src={getStaticUrl(stat.icon)}
                    alt={stat.type}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </div>
                <div className="text-xs sm:text-lg text-default-800 truncate">
                  {t(`stats:${stat.type}.name`)}
                </div>
                <div className="text-xs sm:text-lg text-default-800 font-semibold">
                  {infoStatsDict[stat.type]?.value ?? "-"}
                </div>
              </div>
            </AdaptiveTooltip>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="shadow-none bg-character-input border-1 border-crafting-border rounded-lg">
      <CardBody className="space-y-4">
        <div className="mb-0">{renderStatGrid("mainStats")}</div>
        {!isCollapsed && (
          <div className="mt-3">{renderStatGrid("lordStats")}</div>
        )}
      </CardBody>
      <Divider/>
      <CardFooter className="p-0">
        <Button
          variant="light"
          disableRipple
          disableAnimation
          onPress={() => setIsCollapsed(!isCollapsed)}
          className="
            w-full text-default-700 gap-2 shadow-none bg-transparent
            hover:bg-transparent active:bg-transparent focus:bg-transparent focus-visible:bg-transparent
            data-[hover=true]:bg-transparent data-[pressed=true]:bg-transparent data-[focus-visible=true]:bg-transparent
          "
          size="md"
          radius="none"
        >
          {isCollapsed ? t("common:menu.expand", "Expand") : t("common:menu.collapse", "Collapse")}
          <FontAwesomeIcon icon={isCollapsed ? faChevronDown : faChevronUp} />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default React.memo(CharacterStats);
