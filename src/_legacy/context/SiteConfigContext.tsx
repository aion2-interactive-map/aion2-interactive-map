// src/context/SiteConfigContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type SiteConfig = Record<string, unknown>;

type SiteConfigContextValue = {
  siteConfig: SiteConfig;

  getConfigValue: <T = unknown>(key: string, defaultValue?: T) => T;
  setConfigValue: (key: string, value: unknown) => void;
  setConfigValues: (values: SiteConfig) => void;
  removeConfigKey: (key: string) => void;
  resetConfig: () => void;
};

const STORAGE_KEY = "aion2.siteConfig.v1";

const SiteConfigContext =
  createContext<SiteConfigContextValue | null>(null);

export const SiteConfigProvider: React.FC<{ children: ReactNode }> = ({
                                                                        children,
                                                                      }) => {
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(siteConfig));
  }, [siteConfig]);

  const setConfigValue = useCallback((key: string, value: unknown) => {
    setSiteConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const setConfigValues = useCallback((values: SiteConfig) => {
    setSiteConfig((prev) => ({
      ...prev,
      ...values,
    }));
  }, []);

  const removeConfigKey = useCallback((key: string) => {
    setSiteConfig((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    setSiteConfig({});
  }, []);

  const getConfigValue = useCallback(
    <T,>(key: string, defaultValue?: T): T => {
      return (key in siteConfig ? siteConfig[key] : defaultValue) as T;
    },
    [siteConfig],
  );

  return (
    <SiteConfigContext.Provider
      value={{
        siteConfig,
        getConfigValue,
        setConfigValue,
        setConfigValues,
        removeConfigKey,
        resetConfig,
      }}
    >
      {children}
    </SiteConfigContext.Provider>
  );
};

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) {
    throw new Error(
      "useSiteConfig must be used inside <SiteConfigProvider>",
    );
  }
  return ctx;
}
