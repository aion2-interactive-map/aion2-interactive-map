// context/ServerDataContext.tsx

import React, { createContext, useContext, useEffect, useState } from "react";
import { useYamlLoader } from "@/hooks/useYamlLoader";
import type { RawServersFile, ServerMeta } from "@/types/game";

export type ServerDataContextValue = {
  servers: ServerMeta[];
  loading: boolean;
};

const ServerDataContext = createContext<ServerDataContextValue | null>(null);

type ServerDataProviderProps = {
  children: React.ReactNode;
};

export const ServerDataProvider: React.FC<ServerDataProviderProps> = ({ children }) => {
  const [servers, setServers] = useState<ServerMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const loadYaml = useYamlLoader();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const serversData = await loadYaml<RawServersFile>("data/servers.yaml");
        if (cancelled) return;
        setServers(serversData.servers ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [loadYaml]);

  return (
    <ServerDataContext.Provider value={{ servers, loading }}>
      {children}
    </ServerDataContext.Provider>
  );
};

export function useServerData(): ServerDataContextValue {
  const ctx = useContext(ServerDataContext);
  if (!ctx) {
    throw new Error("useServerData must be used inside <ServerDataProvider>");
  }
  return ctx;
}
