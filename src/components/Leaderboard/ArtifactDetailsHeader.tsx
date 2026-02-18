import React from "react";
import {Button} from "@heroui/react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faArrowLeft} from "@fortawesome/free-solid-svg-icons";
import {useNavigate} from "@tanstack/react-router";

interface ArtifactDetailsHeaderProps {
  matching: any;
  t: any;
}

const ArtifactDetailsHeader: React.FC<ArtifactDetailsHeaderProps> = ({ matching, t }) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-4">
      <Button
        isIconOnly
        variant="flat"
        className="bg-character-card border-1 border-crafting-border"
        onClick={() => navigate({to: "/leaderboard"})}
      >
        <FontAwesomeIcon icon={faArrowLeft}/>
      </Button>
      <h1 className="text-2xl font-bold">
        {matching ? (
          <>
            <span className="text-primary">{matching.server1.serverName}</span>
            <span className="mx-2">VS</span>
            <span className="text-secondary">{matching.server2.serverName}</span>
          </>
        ) : t("common:leaderboard.artifactDetails")}
      </h1>
    </div>
  );
};

export default ArtifactDetailsHeader;
