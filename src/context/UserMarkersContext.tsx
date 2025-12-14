// src/context/UserMarkersContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {v4 as uuidv4} from "uuid";
import {keyBy} from "lodash";
import type {UserMarkerInstance} from "@/types/game";
import {useGameMap} from "@/context/GameMapContext.tsx";
import {useUser} from "@/context/UserContext.tsx";

type ContextValue = {
  pickMode: boolean;
  setPickMode: (v: boolean) => void;

  userMarkers: UserMarkerInstance[];
  userMarkersByMarkerId: Record<string, UserMarkerInstance>;

  createMarker: (x: number, y: number) => void;
  createMarkerRemote: (marker: UserMarkerInstance) => void;
  updateMarker: (marker: UserMarkerInstance) => void;
  deleteMarker: (id: string) => void;

  editingMarker: UserMarkerInstance | null;
  setEditingMarker: (m: UserMarkerInstance | null) => void;

  showUserMarkers: boolean;
  setShowUserMarkers: (value: boolean) => void;
};

const STORAGE_PREFIX = "aion2.userMarkers.v1.";

const UserMarkersContext = createContext<ContextValue | null>(null);

export const UserMarkersProvider: React.FC<{ children: React.ReactNode }> = ({
                                                                               children,
                                                                             }) => {
  const {selectedMap} = useGameMap();

  const [pickMode, setPickMode] = useState(false);
  const [userMarkers, setUserMarkers] = useState<UserMarkerInstance[]>([]);
  const [userMarkersByMarkerId, setUserMarkersByMarkerId] = useState<Record<string, UserMarkerInstance>>({});
  const [editingMarker, setEditingMarker] =
    useState<UserMarkerInstance | null>(null);
  const {fetchWithAuth} = useUser();
  const [showUserMarkers, setShowUserMarkers] = useState<boolean>(true);

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
          results.forEach((marker: UserMarkerInstance) => {
            if (marker.type === "local") {
              markers.set(marker.id, marker)
            }
          });
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
                markerId: result.markerId,
                subtype: result.subtypeId,
                mapId: result.mapId,
                x: result.x,
                y: result.y,
                name: result.name,
                description: result.description,
                image: result.image?.s3Key || "",
                type: result.type === "create" ? "uploaded" : "feedback",
                status: result.status,
                reply: result.reply,
              }
              markers.set(marker.id, marker);
            })
          }
        }
      } catch (e) {
        console.error(e);
      }

      const markersArray = [...markers.values()]
      setUserMarkers(markersArray);
      setUserMarkersByMarkerId(keyBy(markersArray.filter(marker => marker.type === "feedback"), "markerId"));
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
        markerId: "",
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
    (marker: UserMarkerInstance) => {
      setUserMarkers((prev) => [...prev, marker]);
      setUserMarkersByMarkerId((prev) => ({
        ...prev,
        [marker.markerId]: marker,
      }));
    },
    [],
  );

  const updateMarker = useCallback((marker: UserMarkerInstance) => {
    setUserMarkers((prev) =>
      prev.map((m) => (m.id === marker.id ? marker : m)),
    );
    setUserMarkersByMarkerId((prev) => ({
      ...prev,
      [marker.markerId]: marker,
    }));
  }, []);

  const deleteMarker = useCallback((id: string) => {
    setUserMarkers((prev) => prev.filter((m) => m.id !== id));
    setEditingMarker(null);
  }, []);

  // const getUserMarkerById = useCallback((markerId: string) => {
  //   return userMarkersByMarkerId[markerId] || null;
  // }, []);

  return (
    <UserMarkersContext.Provider
      value={{
        pickMode,
        setPickMode,
        userMarkers,
        userMarkersByMarkerId,
        createMarker,
        createMarkerRemote,
        updateMarker,
        deleteMarker,
        editingMarker,
        setEditingMarker,
        showUserMarkers,
        setShowUserMarkers,
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
