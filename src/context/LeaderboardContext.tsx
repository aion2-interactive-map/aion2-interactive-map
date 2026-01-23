import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getApiUrl } from "@/utils/url";
import type { ApiResponse, Season, ServerMatching, Artifact, ArtifactState, ArtifactCount } from "@/types/leaderboard";
import { MAP_NAMES } from "@/types/game";

export interface LeaderboardContextValue {
  seasons: Season[];
  currentSeason: Season | null;
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
  fetchArtifactStates: (seasonId: string) => Promise<void>;
  fetchArtifactCounts: (seasonId: string, mapName: string) => Promise<void>;
}

export const ALL_MAPS_KEY = "ALL";

const LeaderboardContext = createContext<LeaderboardContextValue | null>(null);

export const LeaderboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [serverMatchings, setServerMatchings] = useState<ServerMatching[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [artifactStates, setArtifactStates] = useState<ArtifactState[]>([]);
  const [artifactCounts, setArtifactCounts] = useState<ArtifactCount[]>([]);
  const [region, setRegion] = useState<string>("tw");
  
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingMatchings, setLoadingMatchings] = useState(false);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);
  const [loadingArtifactStates, setLoadingArtifactStates] = useState(false);
  const [loadingArtifactCounts, setLoadingArtifactCounts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSeasons = useCallback(async () => {
    setLoadingSeasons(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl("/api/v1/seasons/"));
      const result: ApiResponse<Season> = await response.json();
      if (result.errorCode === "Success") {
        setSeasons(result.data.results);
        // Default to the latest season if available
        if (result.data.results.length > 0) {
          setCurrentSeason(result.data.results[result.data.results.length - 1]);
        }
      } else {
        setError(result.errorMessage || "Failed to fetch seasons");
      }
    } catch (e) {
      console.error("Failed to fetch seasons:", e);
      setError("Network error fetching seasons");
    } finally {
      setLoadingSeasons(false);
    }
  }, []);

  const fetchServerMatchings = useCallback(async (seasonId: string) => {
    setLoadingMatchings(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl(`/api/v1/seasons/${seasonId}/server_matchings/`));
      const result: ApiResponse<ServerMatching> = await response.json();
      if (result.errorCode === "Success") {
        setServerMatchings(result.data.results);
      } else {
        setError(result.errorMessage || "Failed to fetch server matchings");
      }
    } catch (e) {
      console.error("Failed to fetch server matchings:", e);
      setError("Network error fetching server matchings");
    } finally {
      setLoadingMatchings(false);
    }
  }, []);

  const fetchArtifacts = useCallback(async () => {
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
  }, []);

  const fetchArtifactStates = useCallback(async (seasonId: string) => {
    setLoadingArtifactStates(true);
    setError(null);
    try {
      const mapNames = [MAP_NAMES.ABYSS_A, MAP_NAMES.ABYSS_B];
      const promises = mapNames.map(async (mapName) => {
        try {
          const response = await fetch(getApiUrl(`/api/v1/seasons/${seasonId}/maps/${mapName}/artifacts/states`));
          if (!response.ok) {
            return [];
          }
          const result: ApiResponse<ArtifactState> = await response.json();
          return result.errorCode === "Success" ? result.data.results : [];
        } catch (innerError) {
          console.error(`Error fetching artifact states for ${mapName}:`, innerError);
          return [];
        }
      });

      const results = await Promise.all(promises);
      const allStates = results.flat();
      setArtifactStates(allStates);
    } catch (e) {
      console.error("Failed to fetch artifact states:", e);
      setError("Network error fetching artifact states");
    } finally {
      setLoadingArtifactStates(false);
    }
  }, []);

  const fetchArtifactCounts = useCallback(async (seasonId: string, mapName: string) => {
    setLoadingArtifactCounts(true);
    setError(null);
    try {
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
        setArtifactCounts(Object.values(sumMap));
      } else {
        const response = await fetch(getApiUrl(`/api/v1/seasons/${seasonId}/maps/${mapName}/artifacts/count`));
        const result: ApiResponse<ArtifactCount> = await response.json();
        if (result.errorCode === "Success") {
          setArtifactCounts(result.data.results);
        } else {
          setError(result.errorMessage || "Failed to fetch artifact counts");
        }
      }
    } catch (e) {
      console.error("Failed to fetch artifact counts:", e);
      setError("Network error fetching artifact counts");
    } finally {
      setLoadingArtifactCounts(false);
    }
  }, []);

  useEffect(() => {
    fetchSeasons();
    fetchArtifacts();
  }, [fetchSeasons, fetchArtifacts]);

  useEffect(() => {
    if (currentSeason) {
      fetchServerMatchings(currentSeason.id);
      fetchArtifactStates(currentSeason.id);
    }
  }, [currentSeason, fetchServerMatchings, fetchArtifactStates]);

  return (
    <LeaderboardContext.Provider
      value={{
        seasons,
        currentSeason,
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
