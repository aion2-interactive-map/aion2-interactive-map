import React from "react";
import {useCharacter} from "@/context/CharacterContext.tsx";
import {Card, CardBody, Spinner} from "@heroui/react";
// import {useTranslation} from "react-i18next";

const CharacterRankings: React.FC = () => {
  const {info} = useCharacter();
  // const {t} = useTranslation();

  if (!info || !info.rankings || info.rankings.length === 0) {
    return (
      <div className="flex justify-center items-center py-4 w-full">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
      {info.rankings.map((ranking, index) => (
        <Card key={index} className="shadow-none bg-character-card border-1 border-crafting-border rounded-lg">
          <CardBody className="p-2 flex flex-row items-center gap-3">
            <div className="flex flex-col flex-1 min-w-0 justify-between h-full">
              <div className="flex items-center gap-1">
                <span className="text-[18px] text-primary">
                  第 {ranking.rank ?? "-"} 名
                </span>
                {ranking.rankChange !== null && ranking.rankChange !== 0 && !isNaN(ranking.rankChange) && (
                  <span className={`text-[14px] ${ranking.rankChange > 0 ? 'text-danger' : 'text-success'}`}>
                    {ranking.rankChange > 0 ? `↓ ${ranking.rankChange}` : `↑ ${Math.abs(ranking.rankChange)}`}
                  </span>
                )}
              </div>
              <div className="text-[14px] text-default-800">
                {ranking.rankingContentsName}
              </div>
            </div>
            <div className="flex flex-col items-center shrink-0 justify-between h-full">
              {ranking.gradeIcon && (
                <img
                  src={ranking.gradeIcon}
                  alt={ranking.gradeName || "grade"}
                  className="w-10 h-10 object-contain"
                />
              )}
              {ranking.point !== null && (
                <div className="text-[12px] text-default-800 font-medium">
                  {ranking.point}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};

export default React.memo(CharacterRankings);
