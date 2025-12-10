// src/context/UserMarkersContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { v4 as uuidv4 } from "uuid";
import type { UserMarkerInstance } from "@/types/game";
import { useGameMap } from "@/context/GameMapContext.tsx";
import {useUser} from "@/context/UserContext.tsx";

type ContextValue = {
  pickMode: boolean;
  setPickMode: (v: boolean) => void;

  userMarkers: UserMarkerInstance[];

  createMarker: (x: number, y: number) => void;
  createMarkerRemote: (marker: UserMarkerInstance) => void;
  updateMarker: (marker: UserMarkerInstance) => void;
  deleteMarker: (id: string) => void;

  editingMarker: UserMarkerInstance | null;
  setEditingMarker: (m: UserMarkerInstance | null) => void;
};

const STORAGE_PREFIX = "aion2.userMarkers.v1.";

const UserMarkersContext = createContext<ContextValue | null>(null);

export const UserMarkersProvider: React.FC<{ children: React.ReactNode }> = ({
                                                                               children,
                                                                             }) => {
  const { selectedMap } = useGameMap();

  const [pickMode, setPickMode] = useState(false);
  const [userMarkers, setUserMarkers] = useState<UserMarkerInstance[]>([]);
  const [editingMarker, setEditingMarker] =
    useState<UserMarkerInstance | null>(null);
  const { fetchWithAuth } = useUser();

  /** Helper: storage key per map */
  const getStorageKey = useCallback(
    (mapName: string) => `${STORAGE_PREFIX}${mapName}`,
    [],
  );

  /** 🔁 Load markers when switching map */
  useEffect(() => {
    const load = async () => {
      if (!selectedMap) {
        setUserMarkers([]);
        setEditingMarker(null);
        return;
      }
      
      const markers = new Map<string, UserMarkerInstance>();
      try {
        const raw = localStorage.getItem(getStorageKey(selectedMap.name));
        if (raw) {
          const results = JSON.parse(raw);
          results.forEach((marker: UserMarkerInstance) => markers.set(marker.id, marker));
        }
      } catch (e) {
        console.error(e);
      }

      try {
        const res = await fetchWithAuth(`/maps/${selectedMap?.name}/marker_feedbacks`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.errorCode === "Success") {
            console.log(data.data.results);
            data.data.results.forEach((result: any) => {
              const marker: UserMarkerInstance = {
                id: result.id,
                subtype: result.subtypeId,
                mapId: result.mapId,
                x: result.x,
                y: result.y,
                name: result.name,
                description: result.description,
                image: result.image?.s3Key || "",
                type: "uploaded",
              }
              markers.set(marker.id, marker);
            })
          }
        }
      } catch (e) {
        console.error(e);
      }

      setUserMarkers([...markers.values()]);

    }
    load();

  }, [selectedMap, getStorageKey, fetchWithAuth]);

  /** 💾 Persist markers for current map only */
  useEffect(() => {
    if (!selectedMap) return;
    localStorage.setItem(
      getStorageKey(selectedMap.name),
      JSON.stringify(userMarkers.filter(marker => marker.type === "local")),
    );
  }, [userMarkers, selectedMap, getStorageKey]);

  const createMarker = useCallback(
    (x: number, y: number) => {
      if (!selectedMap) return;

      const marker: UserMarkerInstance = {
        id: uuidv4(),
        subtype: "",
        mapId: selectedMap.id,
        x,
        y,
        name: "",
        description: "",
        image: "",
        type: "local",
      };

      setUserMarkers((prev) => [...prev, marker]);
      setEditingMarker(marker);
      setPickMode(false);
    },
    [selectedMap],
  );

  const createMarkerRemote = useCallback(
    (marker: UserMarkerInstance)=> {
      setUserMarkers((prev) => [...prev, marker]);
    },
    [],
  );

  const updateMarker = useCallback((marker: UserMarkerInstance) => {
    setUserMarkers((prev) =>
      prev.map((m) => (m.id === marker.id ? marker : m)),
    );
  }, []);

  const deleteMarker = useCallback((id: string) => {
    setUserMarkers((prev) => prev.filter((m) => m.id !== id));
    setEditingMarker(null);
  }, []);

  return (
    <UserMarkersContext.Provider
      value={{
        pickMode,
        setPickMode,
        userMarkers,
        createMarker,
        createMarkerRemote,
        updateMarker,
        deleteMarker,
        editingMarker,
        setEditingMarker,
      }}
    >
      {children}
    </UserMarkersContext.Provider>
  );
};

export function useUserMarkers() {
  const ctx = useContext(UserMarkersContext);
  if (!ctx) {
    throw new Error("useUserMarkers must be used inside <UserMarkersProvider>");
  }
  return ctx;
}
