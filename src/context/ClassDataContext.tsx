import React, { createContext, useContext, useEffect, useState } from "react";
import { useYamlLoader } from "@/hooks/useYamlLoader";
import type { ClassMeta, RawClassesFile } from "@/types/game";

export type ClassDataContextValue = {
  classes: ClassMeta[];
  loading: boolean;
};

const ClassDataContext = createContext<ClassDataContextValue | null>(null);

type ClassDataProviderProps = {
  children: React.ReactNode;
};

export const ClassDataProvider: React.FC<ClassDataProviderProps> = ({ children }) => {
  const [classes, setClasses] = useState<ClassMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const loadYaml = useYamlLoader();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const classesData = await loadYaml<RawClassesFile>("data/classes.yaml");
        if (cancelled) return;
        setClasses(classesData.classes ?? []);
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
    <ClassDataContext.Provider value={{ classes, loading }}>
      {children}
    </ClassDataContext.Provider>
  );
};

export function useClassData(): ClassDataContextValue {
  const ctx = useContext(ClassDataContext);
  if (!ctx) {
    throw new Error("useClassData must be used inside <ClassDataProvider>");
  }
  return ctx;
}
