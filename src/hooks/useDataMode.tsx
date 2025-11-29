// src/hooks/useDataMode.ts
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import i18n from "../i18n";
import {
  type DataMode,
  DEFAULT_DATA_MODE,
  computeExportBaseUrl,
  getBackendLoadPath,
} from "@/utils/dataMode"; // <-- new import

type DataModeContextValue = {
  dataMode: DataMode;
  setDataMode: (mode: DataMode) => void;
  toggleDataMode: () => void;
  getBaseUrl: () => string;
  reloadI18n: () => void;
};

const DataModeContext = createContext<DataModeContextValue | undefined>(
  undefined,
);

// --- i18n update helper ---

function updateI18nForMode(mode: DataMode) {
  console.log("updateI18nForMode:", mode);
  const backend = i18n.services.backendConnector?.backend ?? null;

  if (backend) {
    backend.options = backend.options || {};
    backend.options.loadPath = getBackendLoadPath(mode);
  }

  i18n.reloadResources().catch((e) =>
    console.error("[useDataMode] reloadResources error:", e),
  );
}

// --- Provider ---

type ProviderProps = {
  children: ReactNode;
};

export function DataModeProvider({ children }: ProviderProps) {
  const [dataMode, setDataModeState] = useState<DataMode>(DEFAULT_DATA_MODE);

  const setDataMode = useCallback((mode: DataMode) => {
    setDataModeState(mode);
  }, []);

  const toggleDataMode = useCallback(() => {
    setDataModeState((prev) => {
      const next = prev === "static" ? "dynamic" : "static";
      console.log("toggleDataMode", prev, "->", next);
      return next;
    });
  }, []);

  const getBaseUrl = useCallback(() => {
    return computeExportBaseUrl(dataMode);
  }, [dataMode]);

  const reloadI18n = useCallback(() => {
    updateI18nForMode(dataMode);
  }, [dataMode]);

  useEffect(() => {
    updateI18nForMode(dataMode);
  }, [dataMode]);

  const value = useMemo<DataModeContextValue>(
    () => ({
      dataMode,
      setDataMode,
      toggleDataMode,
      getBaseUrl,
      reloadI18n,
    }),
    [dataMode, setDataMode, toggleDataMode, getBaseUrl, reloadI18n],
  );

  return (
    <DataModeContext.Provider value={value}>
      {children}
    </DataModeContext.Provider>
  );
}

// --- Hook ---

export function useDataMode(): DataModeContextValue {
  const ctx = useContext(DataModeContext);
  if (!ctx) {
    throw new Error("useDataMode must be used within a DataModeProvider");
  }
  return ctx;
}
