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

type ContextValue = {
  pickMode: boolean;
  setPickMode: (v: boolean) => void;

  userMarkers: UserMarkerInstance[];

  createMarker: (x: number, y: number) => void;
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

  /** Helper: storage key per map */
  const getStorageKey = useCallback(
    (mapName: string) => `${STORAGE_PREFIX}${mapName}`,
    [],
  );

  /** 🔁 Load markers when switching map */
  useEffect(() => {
    if (!selectedMap) {
      setUserMarkers([]);
      setEditingMarker(null);
      return;
    }

    try {
      const raw = localStorage.getItem(getStorageKey(selectedMap.name));
      if (raw) {
        setUserMarkers(JSON.parse(raw));
      } else {
        setUserMarkers([]);
      }
    } catch {
      setUserMarkers([]);
    }
  }, [selectedMap, getStorageKey]);

  /** 💾 Persist markers for current map only */
  useEffect(() => {
    if (!selectedMap) return;
    localStorage.setItem(
      getStorageKey(selectedMap.name),
      JSON.stringify(userMarkers),
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
        type: "local",
      };

      setUserMarkers((prev) => [...prev, marker]);
      setEditingMarker(marker);
      setPickMode(false);
    },
    [selectedMap],
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
