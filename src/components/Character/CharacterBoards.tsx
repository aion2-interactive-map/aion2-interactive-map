import React, {useState, useEffect, useMemo} from "react";
import {useCharacter} from "@/context/CharacterContext.tsx";
import {getStaticUrl} from "@/utils/url.ts";
import {Modal, ModalContent, ModalHeader, ModalBody, useDisclosure, CircularProgress} from "@heroui/react";
import {AdaptiveTooltip} from "@/components/AdaptiveTooltip.tsx";
import {useBoardData} from "@/context/BoardDataContext.tsx";
import {useDetectedClass} from "@/hooks/useDetectedClass.ts";
import type {BoardNode} from "@/types/game.ts";
import {useTranslation} from "react-i18next";

const middleIcons = [
  "images/Board/Nezekan.webp",
  "images/Board/Zikel.webp",
  "images/Board/Vaizel.webp",
  "images/Board/Triniel.webp",
  null,
  null
];

const CharacterBoards: React.FC = () => {
  const {info, boardDetails, stats} = useCharacter();
  const {boards: staticBoards, loadBoardsForClass, loading: boardsLoading} = useBoardData();
  const detectedClassName = useDetectedClass();
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  const [selectedBoard, setSelectedBoard] = useState<number | null>(null);
  const {t} = useTranslation();

  const boardStatsMap = useMemo(() => {
    if (!stats?.boardStats) return {};
    return Object.fromEntries(stats.boardStats.map(s => [s.type, s.value]));
  }, [stats]);

  useEffect(() => {
    if (detectedClassName) {
      loadBoardsForClass(detectedClassName);
    }
  }, [detectedClassName, loadBoardsForClass]);


  const handleIconClick = (boardId: number) => {
    setSelectedBoard(boardId);
    onOpen();
  };

  const currentStaticBoard = useMemo(() => {
    return staticBoards.find(b => b.id === selectedBoard);
  }, [staticBoards, selectedBoard]);

  const currentBoardDetail = useMemo(() => {
    if (!selectedBoard || !boardDetails) return null;
    return boardDetails[`boards:${selectedBoard}`];
  }, [boardDetails, selectedBoard]);

  console.log(boardDetails)

  if (!info || !info.boards) return null;

  const getIconForNode = (node: BoardNode, isOpen: boolean) => {
    if (node.grade === "None") {
      const className = detectedClassName?.toLowerCase();
      return `images/Board/board_icon_start_${className}.webp`;
    }
    const grade = node.grade?.toLowerCase() || "common";
    return `images/Board/board_icon_${grade}${isOpen ? "_open" : ""}.webp`;
  };

  const renderBoardGrid = () => {
    if (boardsLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <CircularProgress aria-label="Loading..." size="lg" />
          <div className="text-default-500">正在加载星盘数据...</div>
        </div>
      );
    }

    if (!currentStaticBoard) {
      return (
        <div className="py-20 text-center text-default-500">
          未能加载星盘配置
        </div>
      );
    }

    const grid: (BoardNode | null)[][] = Array.from({length: 15}, () => Array(15).fill(null));

    currentStaticBoard.nodes.forEach(node => {
      const pos = node.id % 1000;
      const row = Math.floor((pos - 1) / 15);
      const col = ((pos - 1) % 15);

      if (row >= 0 && row < 15 && col >= 0 && col < 15) {
        grid[row][col] = node;
      }
    });

    return (
      <div 
        className="grid gap-1 mx-auto aspect-square w-full p-2"
        style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}
      >
        {grid.map((row, rowIndex) => (
          row.map((node, colIndex) => {
            if (!node) return <div key={`empty-${rowIndex}-${colIndex}`} className="aspect-square" />;

            const isNodeOpen = currentBoardDetail?.openNodes.includes(node.id);
            const icon = getIconForNode(node, !!isNodeOpen);

            return (
              <div key={node.id} className="aspect-square flex items-center justify-center relative">
                <AdaptiveTooltip
                  isDisabled={node.grade === "None"}
                  content={
                    <div className="px-2 py-1">
                      {node.skillId && (
                        <div className="text-xs text-foreground flex justify-between gap-1">
                          <span>{t(`skills:${node.skillId}.name`, String(node.skillId))}</span>
                          <span className="font-bold">+Lv.1</span>
                        </div>
                      )}
                      {node.stats?.map((stat, i) => (
                        <div key={i} className="text-xs text-foreground flex justify-between gap-1">
                          <span>{t(`stats:${stat}.name`, stat)}</span>
                          <span className="font-bold">+{boardStatsMap[stat] || ""}</span>
                        </div>
                      ))}
                    </div>
                  }
                  delay={0}
                  closeDelay={0}
                  classNames={{ base: "pointer-events-none" }}
                >
                  <img
                    src={getStaticUrl(icon)}
                    alt={node.grade}
                    className={`w-full h-full object-contain cursor-help transition-transform hover:scale-110 hover:z-50 active:scale-95 ${!isNodeOpen && node.grade !== 'None' ? 'opacity-60 grayscale-[0.5]' : ''}`}
                    draggable={false}
                  />
                </AdaptiveTooltip>
              </div>
            );
          })
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        {info.boards.map((board, index) => (
          <AdaptiveTooltip
            key={board.id}
            content={
              <div className="px-1 py-1">
                <div className="font-bold text-foreground text-center">{board.name}</div>
                <div className="text-xs text-default-800 text-center">
                  {board.openNodeCount} / {board.totalNodeCount}
                </div>
              </div>
            }
            placement="top"
            radius="sm"
            delay={0}
            closeDelay={0}
          >
            <div
              className="text-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
              tabIndex={0}
              onClick={() => handleIconClick(board.id)}
            >
              <div className="w-full max-w-[80px] aspect-square mx-auto rounded-lg overflow-hidden relative flex items-center justify-center">
                <img
                  src={getStaticUrl("images/Board/Background.webp")}
                  alt=""
                  className={`w-full h-full object-cover ${board.open === 0 ? 'grayscale opacity-50' : ''}`}
                  draggable={false}
                />
                {middleIcons[index] && (
                  <img
                    src={getStaticUrl(middleIcons[index]!)}
                    alt={board.name}
                    className={`absolute inset-0 w-full h-full object-contain p-2 ${board.open === 0 ? 'grayscale opacity-50' : ''}`}
                    draggable={false}
                  />
                )}
                <CircularProgress
                  aria-label={board.name}
                  size="sm"
                  value={(board.openNodeCount / board.totalNodeCount) * 100}
                  color="primary"
                  disableAnimation
                  className="absolute inset-0 z-10 p-1.5"
                  classNames={{
                    svg: "w-full h-full",
                    indicator: "stroke-primary",
                    track: "stroke-transparent",
                  }}
                />
              </div>
              <div className="text-[14px] text-default-800 truncate mt-1">
                {Math.round(board.openNodeCount / board.totalNodeCount * 100)}%
              </div>
            </div>
          </AdaptiveTooltip>
        ))}
      </div>

      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange} 
        size="3xl"
        // scrollBehavior="inside"
        classNames={{
          base: "max-h-[90vh] bg-character-equipment",
          body: "p-2 sm:p-6 overflow-x-hidden",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {info.boards.find(b => b.id === selectedBoard)?.name || "守护力"}
              </ModalHeader>
              <ModalBody>
                {renderBoardGrid()}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default React.memo(CharacterBoards);
