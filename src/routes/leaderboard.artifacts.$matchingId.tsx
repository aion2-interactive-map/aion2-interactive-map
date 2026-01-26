import {createFileRoute, useNavigate} from "@tanstack/react-router";
import {useMemo, useState, useEffect} from "react";
import {useTranslation} from "react-i18next";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Card,
  CardHeader,
  CardBody,
  Divider,
  Tooltip,
} from "@heroui/react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faEdit, faTrash, faPlus, faArrowLeft} from "@fortawesome/free-solid-svg-icons";
import {useLeaderboard} from "@/context/LeaderboardContext.tsx";
import {MAP_NAMES} from "@/types/game.ts";
import {useUser} from "@/context/UserContext.tsx";
import ArtifactStateModal from "@/components/Leaderboard/ArtifactStateModal.tsx";
import PopConfirm from "@/components/PopConfirm";
import Footer from "@/components/Footer.tsx";
import {getStaticUrl} from "@/utils/url.ts";
import type {ArtifactState} from "@/types/leaderboard.ts";

export const Route = createFileRoute("/leaderboard/artifacts/$matchingId")({
  component: ArtifactDetailsPage,
});

function ArtifactDetailsPage() {
  const {matchingId} = Route.useParams();
  const navigate = useNavigate();
  const ABYSS_MAPS = [MAP_NAMES.ABYSS_A, MAP_NAMES.ABYSS_B];
  const markerNs = ABYSS_MAPS.map((x) => `markers/${x}`);
  const {t} = useTranslation([...markerNs, "common"]);
  const {isSuperUser} = useUser();
  const {
    seasons,
    serverMatchings,
    artifactsByMap,
    fetchServerMatching,
    fetchArtifactStates,
    region,
    deleteArtifactState,
  } = useLeaderboard();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMapName, setEditingMapName] = useState<string | null>(null);
  const [editingInitialState, setEditingInitialState] = useState<ArtifactState | null>(null);
  const [matchingArtifactStates, setMatchingArtifactStates] = useState<ArtifactState[]>([]);

  const matching = useMemo(
    () => serverMatchings.find((m) => m.id === matchingId),
    [serverMatchings, matchingId]
  );

  const targetSeasonId = useMemo(() => {
    if (matching) return matching.seasonId;
    const regionSeasons = seasons.filter((s) => s.serverRegion.toLowerCase() === region.toLowerCase());
    if (regionSeasons.length === 0) return null;
    const maxNumber = Math.max(...regionSeasons.map((s) => s.number));
    const season = regionSeasons.find((s) => s.number === maxNumber);
    return season?.id || null;
  }, [region, seasons, matching]);

  useEffect(() => {
    if (targetSeasonId) {
      if (!matching) {
        fetchServerMatching(targetSeasonId, matchingId);
      }
      fetchArtifactStates(targetSeasonId, undefined, matchingId).then((states) => {
        setMatchingArtifactStates(states);
      });
    }
  }, [targetSeasonId, matchingId, matching, fetchServerMatching, fetchArtifactStates]);

  const statesByMap = useMemo(() => {
    const map: Record<string, ArtifactState[]> = {};
    matchingArtifactStates
      .filter((s) => s.serverMatchingId === matchingId)
      .forEach((s) => {
        if (!map[s.mapName]) map[s.mapName] = [];
        map[s.mapName].push(s);
      });

    // Sort each map's states by recordTime desc
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => new Date(b.recordTime).getTime() - new Date(a.recordTime).getTime());
    });
    return map;
  }, [matchingArtifactStates, matchingId]);

  const mapArtifacts = useMemo(() => {
    const map: Record<string, any[]> = {};
    Object.keys(artifactsByMap).forEach((mapId) => {
      map[mapId] = [...artifactsByMap[mapId]].sort((a, b) => a.order - b.order);
    });
    return map;
  }, [artifactsByMap]);

  const handleEdit = (state: ArtifactState, mapName: string) => {
    if (!matching) return;
    setEditingMapName(mapName);
    setEditingInitialState(state);
    setIsModalOpen(true);
  };

  const handleCreate = (mapName: string, baseState?: ArtifactState) => {
    if (!matching) return;
    setEditingMapName(mapName);
    // Use baseState as template (without id)
    setEditingInitialState(baseState ? {...baseState, id: ""} : null);
    setIsModalOpen(true);
  };

  const handleDelete = async (state: ArtifactState) => {
    if (!targetSeasonId) return;
    const success = await deleteArtifactState(targetSeasonId, state.mapName, state.id, matchingId);
    if (success) {
      // Refresh local states
      const states = await fetchArtifactStates(targetSeasonId, undefined, matchingId);
      setMatchingArtifactStates(states);
    }
  };

  const formatTimeDiff = (time1: string, time2: string) => {
    const t1 = new Date(time1).getTime();
    const t2 = new Date(time2).getTime();
    const diffMs = Math.abs(t1 - t2);
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    const targetDiffMs = diffMs - fortyEightHoursMs;

    const isNegative = targetDiffMs < 0;
    const absDiff = Math.abs(targetDiffMs);

    const hours = Math.floor(absDiff / (1000 * 60 * 60));
    const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

    return `${isNegative ? "-" : ""}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const neutralIcon = getStaticUrl("UI/Resource/Texture/Icon/UT_Marker_AbyssArtifact_Neutral.webp");
  const lightIcon = getStaticUrl("UI/Resource/Texture/Icon/UT_Marker_AbyssArtifact_Light.webp");
  const darkIcon = getStaticUrl("UI/Resource/Texture/Icon/UT_Marker_AbyssArtifact_Dark.webp");

  if (!matching && !targetSeasonId) {
    return <div className="p-8 text-center">{t("common:ui.loading")}</div>;
  }

  return (
    <div className="min-h-full flex flex-col">
      <div className="flex-1 flex flex-col items-center p-4">
        <div className="w-full max-w-[1400px] flex flex-col gap-6">
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
              {matching ? `${matching.server1.serverName} VS ${matching.server2.serverName}` : t("common:leaderboard.artifactDetails")}
            </h1>
          </div>

          {ABYSS_MAPS.map((mapName) => {
            const states = statesByMap[mapName] || [];
            const arts = mapArtifacts[mapName] || [];

            return (
              <Card key={mapName} className="bg-character-equipment shadow-none border-1 border-crafting-border">
                <CardHeader className="flex justify-between items-center px-6 py-4">
                  <h2 className="text-xl font-bold">{t(`maps:${mapName}.description`)}</h2>
                  {isSuperUser && (
                    <Button
                      size="sm"
                      color="default"
                      variant="flat"
                      startContent={<FontAwesomeIcon icon={faPlus}/>}
                      onClick={() => handleCreate(mapName)}
                    >
                      {t("common:leaderboard.artifactState.create")}
                    </Button>
                  )}
                </CardHeader>
                <Divider/>
                <CardBody className="p-0 overflow-x-auto">
                  <Table
                    aria-label={`Artifact states for ${mapName}`}
                    className="min-w-full"
                    removeWrapper
                    classNames={{
                      th: "bg-character-card text-foreground border-b border-crafting-border first:rounded-none last:rounded-none",
                      td: "py-3 px-4 border-b border-crafting-border/50",
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
                            <div className="flex flex-col items-center gap-1 min-w-[120px]">
                              <span className="text-[12px] whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
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
                      items={states.flatMap((state, index) => {
                        const rowItems = [];
                        rowItems.push({
                          type: "data",
                          id: state.id,
                          state,
                          mapName,
                          arts
                        });
                        
                        if (index < states.length - 1) {
                          const nextState = states[index + 1];
                          rowItems.push({
                            type: "diff",
                            id: `diff-${state.id}-${nextState.id}`,
                            state,
                            nextState,
                            arts
                          });
                        }
                        return rowItems;
                      })}
                    >
                      {(item: any) => {
                        if (item.type === "diff") {
                          const timeDiff = formatTimeDiff(item.state.recordTime, item.nextState.recordTime);
                          return (
                            <TableRow key={item.id} className="bg-default-50/30">
                              <TableCell colSpan={arts.length + 2}>
                                <div className="flex justify-center items-center px-4 py-1">
                                  <span className="text-sm text-default-800 italic text-center">
                                    {t("common:leaderboard.timeDiffToNext", "Time diff to next record")}: {timeDiff}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return (
                          <TableRow key={item.id}>
                            <TableCell key="recordTime">
                              <div className="flex flex-col">
                                <span className="font-medium">{new Date(item.state.recordTime).toLocaleString()}</span>
                              </div>
                            </TableCell>
                            {item.arts.map((art: any) => {
                              const s = item.state.states.find((as: any) => as.abyssArtifactId === art.id);
                              const icon = s?.state === 1 ? lightIcon : s?.state === 2 ? darkIcon : neutralIcon;
                              return (
                                <TableCell key={art.id}>
                                  <div className="flex justify-center">
                                    <img src={icon} alt="state" className="w-10 h-10"/>
                                  </div>
                                </TableCell>
                              );
                            })}
                            <TableCell key="options">
                              <div className="flex justify-center gap-2">
                                {isSuperUser && (
                                  <>
                                    <Tooltip content={t("common:ui.edit")}>
                                      <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        onClick={() => handleEdit(item.state, item.mapName)}
                                      >
                                        <FontAwesomeIcon icon={faEdit} className="text-primary"/>
                                      </Button>
                                    </Tooltip>
                                    <PopConfirm
                                      title={t("common:leaderboard.deleteConfirm", "Are you sure you want to delete this record?")}
                                      onConfirm={() => handleDelete(item.state)}
                                    >
                                      <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                      >
                                        <FontAwesomeIcon icon={faTrash} className="text-danger"/>
                                      </Button>
                                    </PopConfirm>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }}
                    </TableBody>
                  </Table>
                </CardBody>
              </Card>
            );
          })}
        </div>


        {matching && editingMapName && (
          <ArtifactStateModal
            isOpen={isModalOpen}
            onOpenChange={(open) => {
              setIsModalOpen(open);
              if (!open) {
                // Refresh local states after modal closes (could be success or cancel, 
                // but usually we want latest data if it might have changed)
                fetchArtifactStates(targetSeasonId!, undefined, matchingId).then((states) => {
                  setMatchingArtifactStates(states);
                });
              }
            }}
            matching={matching}
            mapName={editingMapName}
            artifacts={mapArtifacts[editingMapName] || []}
            initialState={editingInitialState}
            seasonId={targetSeasonId!}
          />
        )}
      </div>
      <Footer/>
    </div>
  );
}
