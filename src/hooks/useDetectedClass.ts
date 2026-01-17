import { useMemo } from "react";
import { useCharacter } from "@/context/CharacterContext.tsx";
import { useClassData } from "@/context/ClassDataContext.tsx";

export function useDetectedClass() {
  const { info } = useCharacter();
  const { classes } = useClassData();

  return useMemo(() => {
    if (!info?.boards || info.boards.length === 0) return null;
    const boardId = info.boards[0].id;
    const order = Math.floor(boardId / 10);
    return classes.find(c => c.order === order)?.name || null;
  }, [info?.boards, classes]);
}
