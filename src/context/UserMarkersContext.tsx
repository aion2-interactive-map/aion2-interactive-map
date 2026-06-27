// src/context/UserMarkersContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { UserMarkerInstance } from "@/types/game";
import { useGameMap } from "@/context/GameMapContext";
import { USER_MARKERS_STORAGE_PREFIX } from "@/lib/constants";

type UserMarkersContextValue = {
  userMarkers: UserMarkerInstance[]; // for the current map, type "local" only
  pickMode: boolean;
  setPickMode: (v: boolean) => void;
  createMarker: (x: number, y: number) => void; // pushes a {type:"local"} marker at x,y, persists
  removeMarker: (id: string) => void; // removes by id, persists
  hideUserMarkers: boolean;
  setHideUserMarkers: (v: boolean) => void;
};

const UserMarkersContext = createContext<UserMarkersContextValue | null>(null);

function storageKey(mapName: string): string {
  return `${USER_MARKERS_STORAGE_PREFIX}${mapName}`;
}

function loadLocalMarkers(mapName: string): UserMarkerInstance[] {
  try {
    const raw = localStorage.getItem(storageKey(mapName));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserMarkerInstance[];
    return parsed.filter((m) => m.type === "local");
  } catch (e) {
    console.error(e);
    return [];
  }
}

export const UserMarkersProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { selectedMap } = useGameMap();

  const [pickMode, setPickMode] = useState(false);
  const [hideUserMarkers, setHideUserMarkers] = useState(false);
  const [userMarkers, setUserMarkers] = useState<UserMarkerInstance[]>([]);

  // Load the current map's markers from localStorage when the map changes.
  useEffect(() => {
    if (!selectedMap) {
      setUserMarkers([]);
      return;
    }
    setUserMarkers(loadLocalMarkers(selectedMap.name));
  }, [selectedMap]);

  const persist = useCallback(
    (markers: UserMarkerInstance[]) => {
      if (!selectedMap) return;
      try {
        localStorage.setItem(
          storageKey(selectedMap.name),
          JSON.stringify(markers.filter((m) => m.type === "local")),
        );
      } catch (e) {
        console.error(e);
      }
    },
    [selectedMap],
  );

  const createMarker = useCallback(
    (x: number, y: number) => {
      if (!selectedMap) return;

      const marker: UserMarkerInstance = {
        id: crypto.randomUUID(),
        markerId: "",
        subtype: "",
        mapId: selectedMap.id,
        x,
        y,
        name: "",
        description: "",
        image: "",
        type: "local",
        localType: "fox",
      };

      setUserMarkers((prev) => {
        const next = [...prev, marker];
        persist(next);
        return next;
      });
      setPickMode(false);
    },
    [selectedMap, persist],
  );

  const removeMarker = useCallback(
    (id: string) => {
      setUserMarkers((prev) => {
        const next = prev.filter((m) => m.id !== id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return (
    <UserMarkersContext.Provider
      value={{
        userMarkers,
        pickMode,
        setPickMode,
        createMarker,
        removeMarker,
        hideUserMarkers,
        setHideUserMarkers,
      }}
    >
      {children}
    </UserMarkersContext.Provider>
  );
};

export function useUserMarkers(): UserMarkersContextValue {
  const ctx = useContext(UserMarkersContext);
  if (!ctx) {
    throw new Error("useUserMarkers must be used inside <UserMarkersProvider>");
  }
  return ctx;
}
