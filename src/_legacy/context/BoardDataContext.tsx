import React, { createContext, useContext, useState, useCallback } from "react";
import { useYamlLoader } from "@/hooks/useYamlLoader";
import type { BoardMeta, RawBoardsFile } from "@/types/game";

export type BoardDataContextValue = {
  boards: BoardMeta[];
  loading: boolean;
  error: string | null;
  loadBoardsForClass: (className: string) => Promise<void>;
};

const BoardDataContext = createContext<BoardDataContextValue | null>(null);

type BoardDataProviderProps = {
  children: React.ReactNode;
};

export const BoardDataProvider: React.FC<BoardDataProviderProps> = ({ children }) => {
  const [boards, setBoards] = useState<BoardMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadYaml = useYamlLoader();

  const loadBoardsForClass = useCallback(async (className: string) => {
    if (!className) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await loadYaml<RawBoardsFile>(`data/boards/${className}.yaml`);
      setBoards(data.boards ?? []);
    } catch (e) {
      console.error(`Failed to load boards for class ${className}:`, e);
      setError(`Failed to load boards for class ${className}`);
      setBoards([]);
    } finally {
      setLoading(false);
    }
  }, [loadYaml]);

  return (
    <BoardDataContext.Provider value={{ boards, loading, error, loadBoardsForClass }}>
      {children}
    </BoardDataContext.Provider>
  );
};

export function useBoardData(): BoardDataContextValue {
  const ctx = useContext(BoardDataContext);
  if (!ctx) {
    throw new Error("useBoardData must be used inside <BoardDataProvider>");
  }
  return ctx;
}
