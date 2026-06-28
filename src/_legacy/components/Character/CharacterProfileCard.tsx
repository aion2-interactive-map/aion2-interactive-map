import React from "react";
import {Card, CardBody, Spinner} from "@heroui/react";
import {useCharacter} from "@/context/CharacterContext.tsx";
import {lowerCase} from "lodash";
import moment from 'moment';
import {keyBy} from "lodash";

const CharacterProfileCard: React.FC = () => {
  const {info, isUpdating} = useCharacter();

  if (!info) return null;

  const infoStatsDict = keyBy(info.stats, "type");

  return (
    <Card className="shadow-none bg-character-input border-1 border-crafting-border rounded-lg">
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
            {info.profile.characterName}
            {info.profile.titleName ? <span
              className={`text-grade-${lowerCase(info.profile.titleGrade)}`}> [{info.profile.titleName}]</span> : null}
          </div>
          <div className="mt-2 text-[14px] flex flex-wrap justify-center items-center gap-x-2 gap-y-1 text-default-800">
            <span>{info.profile.raceName}</span>
            <span>|</span>
            <span>{info.profile.serverName}</span>
            <span>|</span>
            <span>{info.profile.className}</span>
            <span>|</span>
            {info.profile.regionName ? <><span>{info.profile.regionName}</span>
              <span>|</span></> : null}
            <span className="font-semibold">战力值{infoStatsDict["ItemLevel"]?.value ?? "-"}</span>
            <span>|</span>
            {isUpdating ? (
              <span className="flex items-center gap-1">
                <span>更新中</span>
                <Spinner size="sm" className="scale-75 origin-left"/>
              </span>
            ) : (
              <span>更新于 {moment(info.updatedAt).fromNow()}</span>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default React.memo(CharacterProfileCard);
