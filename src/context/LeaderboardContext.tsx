import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getApiUrl } from "@/utils/url";
import type { ApiResponse, Season, ServerMatching, Artifact, ArtifactState, ArtifactCount } from "@/types/leaderboard";
import { MAP_NAMES } from "@/types/game";

import { useUser } from "@/context/UserContext";

export interface LeaderboardContextValue {
  seasons: Season[];
  serverMatchings: ServerMatching[];
  artifacts: Artifact[];
  artifactStates: ArtifactState[];
  artifactCounts: ArtifactCount[];
  loadingSeasons: boolean;
  loadingMatchings: boolean;
  loadingArtifacts: boolean;
  loadingArtifactStates: boolean;
  loadingArtifactCounts: boolean;
  error: string | null;
  region: string;
  setRegion: (region: string) => void;
  fetchSeasons: () => Promise<void>;
  fetchServerMatchings: (seasonId: string) => Promise<void>;
  fetchArtifacts: () => Promise<void>;
  fetchArtifactStates: (seasonId: string, currentTime?: Date) => Promise<void>;
  fetchArtifactCounts: (seasonId: string, mapName: string) => Promise<void>;
  createArtifactState: (seasonId: string, mapName: string, data: any) => Promise<boolean>;
  updateArtifactState: (seasonId: string, mapName: string, stateId: string, data: any) => Promise<boolean>;
}

export const ALL_MAPS_KEY = "ALL";

const LeaderboardContext = createContext<LeaderboardContextValue | null>(null);

export const LeaderboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { fetchWithAuth } = useUser();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [serverMatchingsBySeason, setServerMatchingsBySeason] = useState<Record<string, ServerMatching[]>>({});
  const [serverMatchings, setServerMatchings] = useState<ServerMatching[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [artifactStatesBySeason, setArtifactStatesBySeason] = useState<Record<string, ArtifactState[]>>({});
  const [artifactStates, setArtifactStates] = useState<ArtifactState[]>([]);
  const [artifactCountsByMap, setArtifactCountsByMap] = useState<Record<string, Record<string, ArtifactCount[]>>>({});
  const [artifactCounts, setArtifactCounts] = useState<ArtifactCount[]>([]);
  const [region, setRegion] = useState<string>("tw");
  
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingMatchings, setLoadingMatchings] = useState(false);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);
  const [loadingArtifactStates, setLoadingArtifactStates] = useState(false);
  const [loadingArtifactCounts, setLoadingArtifactCounts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSeasons = useCallback(async () => {
    if (seasons.length > 0) return;
    setLoadingSeasons(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl("/api/v1/seasons/"));
      const result: ApiResponse<Season> = await response.json();
      if (result.errorCode === "Success") {
        setSeasons(result.data.results);
      } else {
        setError(result.errorMessage || "Failed to fetch seasons");
      }
    } catch (e) {
      console.error("Failed to fetch seasons:", e);
      setError("Network error fetching seasons");
    } finally {
      setLoadingSeasons(false);
    }
  }, [seasons]);


  const fetchServerMatchings = useCallback(async (seasonId: string) => {
    if (serverMatchingsBySeason[seasonId]) {
      setServerMatchings(serverMatchingsBySeason[seasonId]);
      return;
    }

    setLoadingMatchings(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl(`/api/v1/seasons/${seasonId}/server_matchings/`));
      const result: ApiResponse<ServerMatching> = await response.json();
      if (result.errorCode === "Success") {
        setServerMatchings(result.data.results);
        setServerMatchingsBySeason(prev => ({
          ...prev,
          [seasonId]: result.data.results
        }));
      } else {
        setError(result.errorMessage || "Failed to fetch server matchings");
      }
    } catch (e) {
      console.error("Failed to fetch server matchings:", e);
      setError("Network error fetching server matchings");
    } finally {
      setLoadingMatchings(false);
    }
  }, [serverMatchingsBySeason]);

  const fetchArtifacts = useCallback(async () => {
    if (artifacts.length > 0) return;
    setLoadingArtifacts(true);
    setError(null);
    try {
      const mapIds = [MAP_NAMES.ABYSS_A, MAP_NAMES.ABYSS_B];
      const promises = mapIds.map(async (mapId) => {
        try {
          const response = await fetch(getApiUrl(`/api/v1/maps/${mapId}/artifacts/`));
          if (!response.ok) {
            return [];
          }
          const result: ApiResponse<Artifact> = await response.json();
          return result.errorCode === "Success" ? result.data.results : [];
        } catch (innerError) {
          console.error(`Error fetching artifacts for ${mapId}:`, innerError);
          return [];
        }
      });

      const results = await Promise.all(promises);
      const allArtifacts = results.flat();
      setArtifacts(allArtifacts);
    } catch (e) {
      console.error("Failed to fetch artifacts:", e);
      setError("Network error fetching artifacts");
    } finally {
      setLoadingArtifacts(false);
    }
  }, [artifacts]);

  useEffect(() => {
    fetchSeasons();
    fetchArtifacts();
  }, [fetchSeasons, fetchArtifacts]);

  const fetchArtifactStates = useCallback(async (seasonId: string, currentTime?: Date) => {
    // We only cache the "current" view (no currentTime)
    if (!currentTime && artifactStatesBySeason[seasonId]) {
      setArtifactStates(artifactStatesBySeason[seasonId]);
      return;
    }

    setLoadingArtifactStates(true);
    setError(null);
    try {
      const mapNames = [MAP_NAMES.ABYSS_A, MAP_NAMES.ABYSS_B];
      const promises = mapNames.map(async (mapName) => {
        try {
          let url = getApiUrl(`/api/v1/seasons/${seasonId}/maps/${mapName}/artifacts/states`);
          if (currentTime) {
            const urlObj = new URL(url);
            urlObj.searchParams.set("current_time", currentTime.toISOString());
            url = urlObj.toString();
          }
          const response = await fetch(url);
          if (!response.ok) {
            return [];
          }
          const result: ApiResponse<ArtifactState> = await response.json();
          console.log(`Fetched artifact states for ${mapName}:`, result.data.results);
          return result.errorCode === "Success" ? result.data.results.map(s => ({...s, mapName})) : [];
        } catch (innerError) {
          console.error(`Error fetching artifact states for ${mapName}:`, innerError);
          return [];
        }
      });

      const results = await Promise.all(promises);
      const allStates = results.flat();
      
      setArtifactStates(allStates);

      if (!currentTime) {
        setArtifactStatesBySeason(prev => ({
          ...prev,
          [seasonId]: allStates
        }));
      }
    } catch (e) {
      console.error("Failed to fetch artifact states:", e);
      setError("Network error fetching artifact states");
    } finally {
      setLoadingArtifactStates(false);
    }
  }, [artifactStatesBySeason]);

  const fetchArtifactCounts = useCallback(async (seasonId: string, mapName: string) => {
    if (artifactCountsByMap[seasonId]?.[mapName]) {
      setArtifactCounts(artifactCountsByMap[seasonId][mapName]);
      return;
    }

    setLoadingArtifactCounts(true);
    setError(null);
    try {
      let resultsToSet: ArtifactCount[] = [];
      if (mapName === ALL_MAPS_KEY) {
        const mapNames = [MAP_NAMES.ABYSS_A, MAP_NAMES.ABYSS_B];
        const promises = mapNames.map(async (name) => {
          const response = await fetch(getApiUrl(`/api/v1/seasons/${seasonId}/maps/${name}/artifacts/count`));
          const result: ApiResponse<ArtifactCount> = await response.json();
          return result.errorCode === "Success" ? result.data.results : [];
        });
        const allResults = await Promise.all(promises);
        
        // Sum up counts by serverId
        const sumMap: Record<number, ArtifactCount> = {};
        allResults.flat().forEach(item => {
          if (!sumMap[item.serverId]) {
            sumMap[item.serverId] = { ...item };
          } else {
            sumMap[item.serverId].artifactCount += item.artifactCount;
            sumMap[item.serverId].artifactTotal += item.artifactTotal;
          }
        });
        resultsToSet = Object.values(sumMap);
      } else {
        const response = await fetch(getApiUrl(`/api/v1/seasons/${seasonId}/maps/${mapName}/artifacts/count`));
        const result: ApiResponse<ArtifactCount> = await response.json();
        if (result.errorCode === "Success") {
          resultsToSet = result.data.results;
        } else {
          setError(result.errorMessage || "Failed to fetch artifact counts");
          setLoadingArtifactCounts(false);
          return;
        }
      }

      setArtifactCounts(resultsToSet);
      setArtifactCountsByMap(prev => ({
        ...prev,
        [seasonId]: {
          ...(prev[seasonId] || {}),
          [mapName]: resultsToSet
        }
      }));
    } catch (e) {
      console.error("Failed to fetch artifact counts:", e);
      setError("Network error fetching artifact counts");
    } finally {
      setLoadingArtifactCounts(false);
    }
  }, [artifactCountsByMap]);

  const createArtifactState = useCallback(async (seasonId: string, mapName: string, data: any) => {
    try {
      const response = await fetchWithAuth(`/seasons/${seasonId}/maps/${mapName}/artifacts/states`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.errorCode === "Success") {
        // Clear caches because data changed
        setArtifactStatesBySeason({});
        setArtifactCountsByMap({});
        fetchArtifactStates(seasonId);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to create artifact state:", e);
      return false;
    }
  }, [fetchWithAuth, fetchArtifactStates]);

  const updateArtifactState = useCallback(async (seasonId: string, mapName: string, stateId: string, data: any) => {
    try {
      const response = await fetchWithAuth(`/seasons/${seasonId}/maps/${mapName}/artifacts/states/${stateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.errorCode === "Success") {
        // Clear caches because data changed
        setArtifactStatesBySeason({});
        setArtifactCountsByMap({});
        fetchArtifactStates(seasonId);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to update artifact state:", e);
      return false;
    }
  }, [fetchWithAuth, fetchArtifactStates]);

  return (
    <LeaderboardContext.Provider
      value={{
        seasons,
        serverMatchings,
        artifacts,
        artifactStates,
        artifactCounts,
        loadingSeasons,
        loadingMatchings,
        loadingArtifacts,
        loadingArtifactStates,
        loadingArtifactCounts,
        error,
        region,
        setRegion,
        fetchSeasons,
        fetchServerMatchings,
        fetchArtifacts,
        fetchArtifactStates,
        fetchArtifactCounts,
        createArtifactState,
        updateArtifactState,
      }}
    >
      {children}
    </LeaderboardContext.Provider>
  );
};

export const useLeaderboard = () => {
  const context = useContext(LeaderboardContext);
  if (!context) {
    throw new Error("useLeaderboard must be used within a LeaderboardProvider");
  }
  return context;
};
