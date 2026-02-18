import React from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Tooltip
} from "@heroui/react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrash,
  faCheckCircle,
  faTimesCircle
} from "@fortawesome/free-solid-svg-icons";
import moment from "moment";
import PopConfirm from "@/components/PopConfirm";
import type {ArtifactState} from "@/types/leaderboard.ts";

interface ArtifactStatesTableProps {
  states: ArtifactState[];
  arts: any[];
  mapName: string;
  admins: any[];
  user: any;
  isSuperUser: boolean;
  onVerify: (state: ArtifactState) => void;
  onEdit: (state: ArtifactState, mapName: string) => void;
  onDelete: (state: ArtifactState) => void;
  icons: {
    neutral: string;
    light: string;
    dark: string;
  };
  t: any;
}

const ArtifactStatesTable: React.FC<ArtifactStatesTableProps> = ({
  states,
  arts,
  mapName,
  admins,
  user,
  isSuperUser,
  onVerify,
  onEdit,
  onDelete,
  icons,
  t
}) => {
  return (
    <Table
      aria-label={`Artifact states for ${mapName}`}
      className="min-w-full"
      removeWrapper
      classNames={{
        base: "bg-transparent",
        table: "bg-transparent",
        thead: "bg-transparent",
        th: "bg-[#FFFFFF]/40 text-foreground border-b border-crafting-border first:rounded-none last:rounded-none text-[16px] backdrop-blur-sm",
        td: "py-3 px-4 border-b border-crafting-border/50",
        tr: "bg-character-equipment",
      }}
    >
      <TableHeader
        columns={[
          {id: "recordTime", label: t("common:leaderboard.artifactState.recordTime"), width: 200},
          ...arts.map((art: any) => ({
            id: art.id,
            label: t(`markers/${mapName}:${art.markerId}.name`, {defaultValue: art.marker.name}),
            isArtifact: true
          })),
          {id: "is_verified", label: t("common:leaderboard.artifactState.isVerified"), width: 100},
          {id: "contributors", label: t("common:leaderboard.artifactState.contributors"), width: 200},
          {id: "options", label: t("common:leaderboard.options"), width: 100}
        ]}
      >
        {(column: any) => (
          <TableColumn
            key={column.id}
            width={column.width}
            align="center"
          >
            {column.isArtifact ? (
              <div className="flex flex-col items-center gap-1 min-w-[160px]">
                <span className="text-base whitespace-nowrap overflow-hidden text-ellipsis max-w-[160px]">
                  {column.label}
                </span>
              </div>
            ) : (
              column.label
            )}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody
        emptyContent={t("common:ui.noData")}
        items={states.map((state) => ({
          type: "data",
          id: state.id,
          state,
          mapName,
          arts
        }))}
      >
        {(item: any) => {
          return (
            <TableRow key={item.id}>
              <TableCell key="recordTime">
                <div className="flex flex-col">
                  <span className="text-base text-default-800">{moment(item.state.recordTime).format("YYYY/M/D HH:mm:ss")}</span>
                </div>
              </TableCell>
              {item.arts.map((art: any) => {
                const s = item.state.states.find((as: any) => as.abyssArtifactId === art.id);
                const icon = s?.state === 1 ? icons.light : s?.state === 2 ? icons.dark : icons.neutral;
                return (
                  <TableCell key={art.id}>
                    <div className="flex justify-center">
                      <img src={icon} alt="state" className="w-10 h-10"/>
                    </div>
                  </TableCell>
                );
              })}
              <TableCell key="is_verified">
                <div className="flex justify-center">
                  <FontAwesomeIcon
                    icon={item.state.isVerified ? faCheckCircle : faTimesCircle}
                    className={item.state.isVerified ? "text-success" : "text-default-400"}
                  />
                </div>
              </TableCell>
              <TableCell key="contributors">
                <div className="flex flex-col items-center gap-1">
                  {item.state.contributors && item.state.contributors.length > 0 ? (
                    item.state.contributors.map((c: any) => (
                      <span key={c.id} className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {c.user.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-default-400">-</span>
                  )}
                </div>
              </TableCell>
              <TableCell key="options">
                <div className="flex justify-center gap-2">
                  {(() => {
                    const isContributor = item.state.contributors?.some((c: any) => c.userId === user?.id);
                    const isAdmin = admins.some(a => a.user.id === user?.id);
                    const canEdit = isSuperUser || isAdmin || isContributor;
                    const canDelete = isSuperUser || isAdmin;
                    const canVerify = (isSuperUser || isAdmin) && !item.state.isVerified;

                    return (
                      <>
                        {canVerify && (
                          <Tooltip content={t("common:leaderboard.artifactState.verify")}>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onClick={() => onVerify(item.state)}
                            >
                              <FontAwesomeIcon icon={faCheckCircle} className="text-success"/>
                            </Button>
                          </Tooltip>
                        )}
                        {canEdit && (
                          <Tooltip content={t("common:ui.edit")}>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onClick={() => onEdit(item.state, item.mapName)}
                            >
                              <FontAwesomeIcon icon={faEdit} className="text-primary"/>
                            </Button>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <PopConfirm
                            title={t("common:leaderboard.deleteConfirm", "Are you sure you want to delete this record?")}
                            onConfirm={() => onDelete(item.state)}
                          >
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                            >
                              <FontAwesomeIcon icon={faTrash} className="text-danger"/>
                            </Button>
                          </PopConfirm>
                        )}
                      </>
                    );
                  })()}
                </div>
              </TableCell>
            </TableRow>
          );
        }}
      </TableBody>
    </Table>
  );
};

export default ArtifactStatesTable;
