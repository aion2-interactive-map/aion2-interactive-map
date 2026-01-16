// src/context/CharacterContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Route as CharacterRoute } from "@/routes/character";
import { computeBaseUrl, computeWsUrl } from "@/utils/dataMode.ts";
import { useYamlLoader } from "@/hooks/useYamlLoader";
import { CHARACTER_HISTORY_STORAGE_PREFIX } from "@/constants.ts";
import type {StatsData, RawSkillsFile, SkillMeta } from "@/types/game";
import type {CharacterInfo, CharacterEquipments, CharacterEquipmentDetails, CharacterEquipmentDetail, CharacterSearchItem} from "@/types/character";

export type CharacterSelection = {
  serverId: number;
  characterId: string;
  region: string;
  item?: CharacterSearchItem;
};

export type CharacterContextValue = {
  serverId: number | null;
  characterId: string | null;
  region: string | null;

  info: CharacterInfo | null;
  equipments: CharacterEquipments | null;
  equipmentDetails: CharacterEquipmentDetails | null;
  
  stats: StatsData | null;

  skills: SkillMeta[];
  skillsById: Map<number, SkillMeta>;

  loading: boolean;
  isUpdating: boolean;
  error: string | null;

  selectCharacter: (sel: CharacterSelection) => void;
  clearSelection: () => void;
};

const CharacterContext = createContext<CharacterContextValue | null>(null);

type CharacterProviderProps = {
  children: React.ReactNode;
};

async function fetchCharacterInfo(params: {
  serverId: number;
  characterId: string;
  region: string;
}): Promise<any> {
  const url =
    computeBaseUrl() +
    `/characters/info?server=${params.serverId}&character=${encodeURIComponent(params.characterId)}&region=${params.region}`;

  const resp = await fetch(url, { method: "GET" });
  if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);

  const json = await resp.json();
  if (json?.errorCode && json.errorCode !== "Success") {
    throw new Error(json.errorMessage || "API Error");
  }
  return json?.data;
}

export const CharacterProvider: React.FC<CharacterProviderProps> = ({ children }) => {
  const navigate = useNavigate({ from: CharacterRoute.fullPath });
  const search = useSearch({ from: CharacterRoute.fullPath });

  const [serverId, setServerId] = useState<number | null>(search.serverId ?? null);
  const [characterId, setCharacterId] = useState<string | null>(search.characterId ?? null);
  const [region, setRegion] = useState<string | null>(search.region ?? null);

  const [info, setInfo] = useState<CharacterInfo | null>(null);
  const [equipments, setEquipments] = useState<CharacterEquipments | null>(null);
  const [equipmentDetails, setEquipmentDetails] = useState<CharacterEquipmentDetails | null>(null);

  const [stats, setStats] = useState<StatsData | null>(null);

  const [skills, setSkills] = useState<SkillMeta[]>([]);

  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = React.useRef<WebSocket | null>(null);

  const loadYaml = useYamlLoader();

  // Load stats.yaml
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await loadYaml<StatsData>("data/stats.yaml");
        if (cancelled) return;
        setStats(data);
      } catch (e) {
        if (!cancelled) setError("Failed to load stats data");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [loadYaml]);

  // Load skills.yaml
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await loadYaml<RawSkillsFile>("data/skills.yaml");
        if (cancelled) return;
        setSkills(data.skills ?? []);
      } catch (e) {
        if (!cancelled) setError("Failed to load skills data");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [loadYaml]);

  const skillsById = useMemo(() => {
    const m = new Map<number, SkillMeta>();
    for (const s of skills) m.set(s.id, s);
    return m;
  }, [skills]);

  // Keep local state in sync when URL changes (back/forward)
  useEffect(() => {
    setServerId(search.serverId ?? null);
    setCharacterId(search.characterId ?? null);
    setRegion(search.region ?? null);
  }, [search.serverId, search.characterId, search.region]);

  const selectCharacter = useCallback((sel: CharacterSelection) => {
    setServerId(sel.serverId);
    setCharacterId(sel.characterId);
    setRegion(sel.region);

    // Clear data immediately when switching
    setInfo(null);
    setEquipments(null);
    setEquipmentDetails(null);
    setError(null);

    // Update history in localStorage
    try {
      const historyStr = localStorage.getItem(CHARACTER_HISTORY_STORAGE_PREFIX);
      let history: any[] = historyStr ? JSON.parse(historyStr) : [];
      
      // Remove existing entry for the same character if it exists
      history = history.filter(item => {
        const sid = item.serverId ?? item.item?.serverId ?? (item.id ? item.serverId : undefined);
        const cid = item.id ?? item.characterId ?? item.item?.id;
        return !(sid === sel.serverId && cid === sel.characterId);
      });
      
      // Add to the top
      // If full item is provided, store it directly or wrap it.
      // To be consistent with CharacterSearchItem grid, we prefer storing the full item.
      if (sel.item) {
        history.unshift(sel.item);
      } else {
        // Fallback for when we only have IDs (though we want full items for the grid)
        history.unshift(sel);
      }
      
      // Limit to 20 items
      if (history.length > 20) {
        history = history.slice(0, 20);
      }
      
      localStorage.setItem(CHARACTER_HISTORY_STORAGE_PREFIX, JSON.stringify(history));
    } catch (e) {
      console.error("Failed to update character history", e);
    }

    navigate({
      replace: false,
      search: (prev) => ({
        ...prev,
        serverId: sel.serverId,
        characterId: sel.characterId,
        region: sel.region,
      }),
    });
  }, [navigate]);

  const clearSelection = useCallback(() => {
    setServerId(null);
    setCharacterId(null);
    setRegion(null);
    setInfo(null);
    setEquipments(null);
    setEquipmentDetails(null);
    setError(null);
    setLoading(false);

    navigate({
      replace: false,
      search: (prev) => ({
        ...prev,
        serverId: undefined,
        characterId: undefined,
        region: undefined,
      }),
    });
  }, [navigate]);

  // Fetch character info whenever selection changes
  useEffect(() => {
    let cancelled = false;

    const cleanupWs = () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsUpdating(false);
    };

    async function run() {
      if (!serverId || !characterId || !region) {
        setInfo(null);
        setEquipments(null);
        setEquipmentDetails(null);
        setLoading(false);
        setError(null);
        cleanupWs();
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchCharacterInfo({ serverId, characterId, region });
        if (cancelled) return;

        processCharacterData(data);
        
        const status = data.status;
        if (status !== "cached" && status !== "failed") {
          startWs(serverId, characterId, region);
        } else {
          cleanupWs();
        }

        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
        cleanupWs();
      }
    }

    function mapInfo(value: any, updatedAt?: number): CharacterInfo | null {
      if (!value?.profile) return null;
      return {
        profile: value.profile,
        stats: value.stats || [],
        titles: value.titles || [],
        rankings: value.rankings || [],
        boards: value.boards || [],
        updatedAt: updatedAt
          ? new Date(updatedAt * 1000).toISOString()
          : new Date().toISOString(),
      };
    }

    function mapEquipments(value: any): CharacterEquipments {
      return {
        skills: (value?.skills || []).map((s: any) => ({
          id: s.id,
          skillLevel: s.skillLevel,
          acquired: s.acquired,
          equip: s.equip,
        })),
        equipments: (value?.equipments || []).map((e: any) => ({
          id: e.id,
          enchantLevel: e.enchantLevel,
          exceedLevel: e.exceedLevel,
          slotPos: e.slotPos,
          slotPosName: e.slotPosName,
        })),
        skins: (value?.skins || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          slotPos: s.slotPos,
          slotPosName: s.slotPosName?.includes("Main") ? "MainHand" : s.slotPosName,
          icon: s.icon,
        })),
        pet: value?.pet ? {
          id: value.pet.id,
          name: value.pet.name,
          level: value.pet.level,
          icon: value.pet.icon,
        } : null,
        wing: value?.wing ? {
          id: value.wing.id,
          name: value.wing.name,
          grade: value.wing.grade,
          icon: value.wing.icon,
        } : null,
      };
    }

    function processCharacterData(data: any) {
      const items = data.items || {};
      const meta = data.meta || {};

      if (items.info) {
        const processedInfo = mapInfo(items.info, meta.updatedAt);
        if (processedInfo) setInfo(processedInfo);
      }

      if (items.equipments) {
        setEquipments(mapEquipments(items.equipments));
      }

      const details = Object.entries(items)
        .filter(([key]) => key.startsWith("equipments:"))
        .reduce((acc, [key, value]) => {
          acc[key] = value as CharacterEquipmentDetail;
          return acc;
        }, {} as CharacterEquipmentDetails);

      if (Object.keys(details).length > 0) {
        setEquipmentDetails(details);
      }
    }

    async function reFetch(sid: number, cid: string, reg: string) {
      setIsUpdating(true);
      try {
        const data = await fetchCharacterInfo({ serverId: sid, characterId: cid, region: reg });
        if (cancelled) return;
        processCharacterData(data);
        const status = data.status;
        if (status !== "cached" && status !== "failed") {
          startWs(sid, cid, reg);
        } else {
          setIsUpdating(false);
        }
      } catch (e) {
        console.error("Re-fetch failed", e);
        setIsUpdating(false);
      }
    }

    function startWs(sid: number, cid: string, reg: string) {
      cleanupWs();
      setIsUpdating(true);
      const wsUrl = computeWsUrl() + `/characters/ws?server=${sid}&character=${encodeURIComponent(cid)}&region=${reg}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (!msg || !msg.key) return;

          const key = msg.key;
          const value = msg.value;

          if (key === "info") {
            const processedInfo = mapInfo(value, msg.updated_at);
            if (processedInfo) setInfo(processedInfo);
          } else if (key === "equipments") {
            setEquipments(mapEquipments(value));
          } else if (key.startsWith("equipments:")) {
            setEquipmentDetails((prev) => ({
              ...(prev || {}),
              [key]: value as CharacterEquipmentDetail,
            }));
          }
        } catch (e) {
          console.error("WS parse error", e);
        }
      };

      ws.onclose = () => {
        if (!cancelled) {
          wsRef.current = null;
          setTimeout(() => {
            if (!cancelled) {
              void reFetch(sid, cid, reg);
            }
          }, 1000);
        }
      };

      ws.onerror = (err) => {
        console.error("WS Error:", err);
      };
    }

    void run();

    return () => {
      cancelled = true;
      cleanupWs();
    };
  }, [serverId, characterId, region]);

  const value = useMemo<CharacterContextValue>(
    () => ({
      serverId,
      characterId,
      region,
      info,
      equipments,
      equipmentDetails,
      stats,
      skills,
      skillsById,
      loading,
      isUpdating,
      error,
      selectCharacter,
      clearSelection,
    }),
    [serverId, characterId, region, info, equipments, equipmentDetails, stats, skillsById, loading, isUpdating, error, selectCharacter, clearSelection]
  );

  return <CharacterContext.Provider value={value}>{children}</CharacterContext.Provider>;
};

export function useCharacter(): CharacterContextValue {
  const ctx = useContext(CharacterContext);
  if (!ctx) throw new Error("useCharacter must be used inside <CharacterProvider>");
  return ctx;
}
