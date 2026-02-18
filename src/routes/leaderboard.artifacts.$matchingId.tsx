import {createFileRoute} from "@tanstack/react-router";
import {useMemo, useState, useEffect} from "react";
import {useTranslation} from "react-i18next";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Divider,
} from "@heroui/react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import {useLeaderboard} from "@/context/LeaderboardContext.tsx";
import {MAP_NAMES} from "@/types/game.ts";
import {useUser} from "@/context/UserContext.tsx";
import ArtifactStateModal from "@/components/Leaderboard/ArtifactStateModal.tsx";
import ArtifactAdminChip from "@/components/Leaderboard/ArtifactAdminChip.tsx";
import ArtifactAdminModal from "@/components/Leaderboard/ArtifactAdminModal.tsx";
import ArtifactStatesTable from "@/components/Leaderboard/ArtifactStatesTable.tsx";
import ArtifactDetailsHeader from "@/components/Leaderboard/ArtifactDetailsHeader.tsx";
import Footer from "@/components/Footer.tsx";
import {getStaticUrl, getApiUrl} from "@/utils/url.ts";
import type {ArtifactState} from "@/types/leaderboard.ts";

interface ArtifactAdmin {
  id: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export const Route = createFileRoute("/leaderboard/artifacts/$matchingId")({
  component: ArtifactDetailsPage,
});

function ArtifactDetailsPage() {
  const {matchingId} = Route.useParams();
  const ABYSS_MAPS = [MAP_NAMES.ABYSS_A, MAP_NAMES.ABYSS_B];
  const markerNs = ABYSS_MAPS.map((x) => `markers/${x}`);
  const {t} = useTranslation([...markerNs, "common"]);
  const {user, isSuperUser, fetchWithAuth} = useUser();
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
  const [admins, setAdmins] = useState<ArtifactAdmin[]>([]);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

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

  const fetchAdmins = async () => {
    if (!targetSeasonId || !matchingId) return;
    try {
      const res = await fetch(getApiUrl(`/api/v1/seasons/${targetSeasonId}/server_matchings/${matchingId}/abyss_artifact_admins/`));
      if (res.ok) {
        const json = await res.json();
        if (json.errorCode === "Success") {
          setAdmins(json.data.results);
        }
      }
    } catch (e) {
      console.error("Failed to fetch admins", e);
    }
  };

  const handleAddAdmin = async (newAdminUserId: string) => {
    if (!targetSeasonId || !matchingId || !newAdminUserId) return;
    try {
      const res = await fetchWithAuth(`/seasons/${targetSeasonId}/server_matchings/${matchingId}/abyss_artifact_admins/${newAdminUserId}`, {
        method: "POST"
      });
      if (res.ok) {
        setIsAdminModalOpen(false);
        fetchAdmins();
      }
    } catch (e) {
      console.error("Failed to add admin", e);
    }
  };

  const handleDeleteAdmin = async (userId: string) => {
    if (!targetSeasonId || !matchingId) return;
    try {
      const res = await fetchWithAuth(`/seasons/${targetSeasonId}/server_matchings/${matchingId}/abyss_artifact_admins/${userId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchAdmins();
      }
    } catch (e) {
      console.error("Failed to delete admin", e);
    }
  };

  useEffect(() => {
    if (targetSeasonId) {
      if (!matching) {
        fetchServerMatching(targetSeasonId, matchingId);
      }
      fetchArtifactStates(targetSeasonId, undefined, matchingId).then((states) => {
        setMatchingArtifactStates(states);
      });
      fetchAdmins();
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

  const handleVerify = async (state: ArtifactState) => {
    if (!targetSeasonId) return;
    try {
      const res = await fetchWithAuth(`/seasons/${targetSeasonId}/maps/${state.mapName}/artifacts/states/${state.id}/verify`, {
        method: "POST"
      });
      if (res.ok) {
        // Refresh local states
        const states = await fetchArtifactStates(targetSeasonId, undefined, matchingId);
        setMatchingArtifactStates(states);
      }
    } catch (e) {
      console.error("Failed to verify admin", e);
    }
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
          <ArtifactDetailsHeader matching={matching} t={t} />

          <Card className="bg-transparent shadow-none border-1 border-crafting-border backdrop-blur-sm">
            <CardHeader className="flex justify-between items-center px-6 py-3">
              <div className="flex items-center gap-2">
                <span className="font-bold">{t("common:leaderboard.artifactAdmins")}</span>
                <div className="flex flex-wrap gap-2">
                  {admins.map((admin) => (
                    <ArtifactAdminChip
                      key={admin.id}
                      admin={admin}
                      isSuperUser={isSuperUser}
                      onDelete={handleDeleteAdmin}
                      t={t}
                    />
                  ))}
                  {admins.length === 0 && (
                    <span className="text-sm text-default-400">{t("common:ui.noData")}</span>
                  )}
                </div>
              </div>
              {isSuperUser && (
                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  startContent={<FontAwesomeIcon icon={faPlus}/>}
                  onClick={() => setIsAdminModalOpen(true)}
                >
                  {t("common:ui.add")}
                </Button>
              )}
            </CardHeader>
          </Card>

          {ABYSS_MAPS.map((mapName) => {
            const states = statesByMap[mapName] || [];
            const arts = mapArtifacts[mapName] || [];

            return (
              <Card key={mapName} className="bg-transparent shadow-none border-1 border-crafting-border backdrop-blur-sm">
                <CardHeader className="flex justify-between items-center px-6 py-4 bg-character-equipment">
                  <h2 className="text-xl font-bold">{t(`maps:${mapName}.description`)}</h2>
                  {user && (
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
                  <ArtifactStatesTable
                    states={states}
                    arts={arts}
                    mapName={mapName}
                    admins={admins}
                    user={user}
                    isSuperUser={isSuperUser}
                    onVerify={handleVerify}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    icons={{neutral: neutralIcon, light: lightIcon, dark: darkIcon}}
                    t={t}
                  />
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

        <ArtifactAdminModal
          isOpen={isAdminModalOpen}
          onOpenChange={setIsAdminModalOpen}
          onAddAdmin={handleAddAdmin}
          fetchWithAuth={fetchWithAuth}
          t={t}
        />
      </div>
      <Footer/>
    </div>
  );
}
