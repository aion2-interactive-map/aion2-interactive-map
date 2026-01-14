import React from "react";
import {Card, CardBody} from "@heroui/react";
import {useCharacter} from "@/context/CharacterContext.tsx";
import {lowerCase} from "lodash";
import moment from 'moment';
import {useTranslation} from "react-i18next";
import {keyBy} from "lodash";

const CharacterProfileCard: React.FC = () => {
  const {info} = useCharacter();
  const {i18n} = useTranslation();

  if (!info) return null;

  const infoStatsDict = keyBy(info.stats, "type");
  console.log(info);

  return (
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
            className="font-semibold">战力值{infoStatsDict["ItemLevel"]?.value ?? "-"}</span> |
            更新于 {moment(info.updatedAt).locale(i18n.language.toLowerCase().split('-')[0]).fromNow()}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default React.memo(CharacterProfileCard);
