// src/context/CharacterContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Route as CharacterRoute } from "@/routes/character";
import { computeBaseUrl } from "@/utils/dataMode.ts";
import { useYamlLoader } from "@/hooks/useYamlLoader";
import type {StatsData, RawSkillsFile, SkillMeta } from "@/types/game";
import type {CharacterInfo} from "@/types/character";

export type CharacterSelection = {
  serverId: number;
  characterId: string;
};

export type CharacterContextValue = {
  serverId: number | null;
  characterId: string | null;

  info: CharacterInfo | null;
  stats: StatsData | null;

  skills: SkillMeta[];
  skillsById: Map<number, SkillMeta>;

  loading: boolean;
  error: string | null;

  selectCharacter: (sel: CharacterSelection) => void;
  clearSelection: () => void;
};

const CharacterContext = createContext<CharacterContextValue | null>(null);

type CharacterProviderProps = {
  children: React.ReactNode;
};

async function fetchCharacterInfoPlaceholder(params: {
  serverId: number;
  characterId: string;
}): Promise<CharacterInfo> {
  const url =
    computeBaseUrl() +
    `/characters/info?server=${params.serverId}&character=${encodeURIComponent(params.characterId)}`;

  const resp = await fetch(url, { method: "GET" });
  if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);

  const json = await resp.json();
  return json?.data as CharacterInfo;
}

export const CharacterProvider: React.FC<CharacterProviderProps> = ({ children }) => {
  const navigate = useNavigate({ from: CharacterRoute.fullPath });
  const search = useSearch({ from: CharacterRoute.fullPath });

  const [serverId, setServerId] = useState<number | null>(search.serverId ?? null);
  const [characterId, setCharacterId] = useState<string | null>(search.characterId ?? null);

  const [info, setInfo] = useState<CharacterInfo | null>(null);

  const [stats, setStats] = useState<StatsData | null>(null);

  const [skills, setSkills] = useState<SkillMeta[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [search.serverId, search.characterId]);

  const selectCharacter = (sel: CharacterSelection) => {
    setServerId(sel.serverId);
    setCharacterId(sel.characterId);

    navigate({
      replace: true,
      search: (prev) => ({
        ...prev,
        serverId: sel.serverId,
        characterId: sel.characterId,
      }),
    });
  };

  const clearSelection = () => {
    setServerId(null);
    setCharacterId(null);
    setInfo(null);
    setError(null);
    setLoading(false);

    navigate({
      replace: true,
      search: (prev) => ({
        ...prev,
        serverId: undefined,
        characterId: undefined,
      }),
    });
  };

  // Fetch character info whenever selection changes
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!serverId || !characterId) {
        setInfo(null);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await fetchCharacterInfoPlaceholder({ serverId, characterId });
        if (cancelled) return;
        setInfo(data);
      } catch (e) {
        if (cancelled) return;
        setInfo(null);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [serverId, characterId]);

  const value = useMemo<CharacterContextValue>(
    () => ({
      serverId,
      characterId,
      info,
      stats,
      skills,
      skillsById,
      loading,
      error,
      selectCharacter,
      clearSelection,
    }),
    [serverId, characterId, info, stats, skills, skillsById, loading, error]
  );

  return <CharacterContext.Provider value={value}>{children}</CharacterContext.Provider>;
};

export function useCharacter(): CharacterContextValue {
  const ctx = useContext(CharacterContext);
  if (!ctx) throw new Error("useCharacter must be used inside <CharacterProvider>");
  return ctx;
}
