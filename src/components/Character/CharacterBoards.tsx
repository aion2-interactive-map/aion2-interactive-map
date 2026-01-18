import React, {useState, useEffect, useMemo} from "react";
import {useCharacter} from "@/context/CharacterContext.tsx";
import {getStaticUrl} from "@/utils/url.ts";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
  CircularProgress,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button
} from "@heroui/react";
import {AdaptiveTooltip} from "@/components/AdaptiveTooltip.tsx";
import {useBoardData} from "@/context/BoardDataContext.tsx";
import {useDetectedClass} from "@/hooks/useDetectedClass.ts";
import type {BoardNode} from "@/types/game.ts";
import {useTranslation} from "react-i18next";
import {TransformWrapper, TransformComponent} from "react-zoom-pan-pinch";

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

  const {currentStats, currentSkills} = useMemo(() => {
    const statsMap: Record<string, number> = {};
    const skillsMap: Record<number, number> = {};

    if (currentBoardDetail && currentStaticBoard) {
      currentBoardDetail.openNodes.forEach((nodeId) => {
        const node = currentStaticBoard.nodes.find((n) => n.id === nodeId);
        if (!node) return;

        if (node.stats) {
          node.stats.forEach((statType) => {
            const valStr = boardStatsMap[statType] || "0";
            const val = parseFloat(valStr);
            if (!isNaN(val)) {
              statsMap[statType] = (statsMap[statType] || 0) + val;
            }
          });
        }

        if (node.skillId) {
          skillsMap[node.skillId] = (skillsMap[node.skillId] || 0) + 1;
        }
      });
    }

    const formattedStats = Object.entries(statsMap)
      .map(([type, value]) => {
        const isPercent = (boardStatsMap[type] || "").includes("%");
        return {
          type,
          value: isPercent ? `${value.toFixed(1).replace(/\.0$/, '')}%` : Math.round(value).toString(),
          name: t(`stats:${type}.name`, type),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const formattedSkills = Object.entries(skillsMap)
      .map(([idStr, level]) => {
        const id = parseInt(idStr);
        return {
          id,
          level,
          name: t(`skills:${id}.name`, id.toString()),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return {currentStats: formattedStats, currentSkills: formattedSkills};
  }, [currentBoardDetail, currentStaticBoard, boardStatsMap, t]);

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
    if (boardsLoading || !boardDetails) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <CircularProgress aria-label="Loading..." size="md" />
          <div className="text-default-500 text-sm">{t("character:board.loading", "正在加载星盘数据...")}</div>
        </div>
      );
    }

    if (!currentStaticBoard) {
      return (
        <div className="py-20 text-center text-default-500">
          未能加载守护力配置
        </div>
      );
    }

    const grid: (BoardNode | null)[][] = Array.from({length: 15}, () => Array(15).fill(null));
    let minR = 15, maxR = -1, minC = 15, maxC = -1;

    currentStaticBoard.nodes.forEach(node => {
      const pos = node.id % 1000;
      const row = Math.floor((pos - 1) / 15);
      const col = (pos - 1) % 15;

      if (row >= 0 && row < 15 && col >= 0 && col < 15) {
        grid[row][col] = node;
        if (row < minR) minR = row;
        if (row > maxR) maxR = row;
        if (col < minC) minC = col;
        if (col > maxC) maxC = col;
      }
    });

    const boardWidth = maxR >= 0 ? maxC - minC + 1 : 15;
    const boardHeight = maxR >= 0 ? maxR - minR + 1 : 15;
    const X = Math.max(boardWidth, boardHeight, 1);
    const initialScale = Math.min(3, 15 / X);

    return (
      <div key={`${selectedBoard}-${isOpen}`} className="flex flex-col gap-3">
        <div className="w-full max-w-[75vh] aspect-square mx-auto relative overflow-hidden rounded-lg">
          <TransformWrapper
            initialScale={initialScale}
            minScale={1}
            maxScale={3}
            centerOnInit={true}
            panning={{
              excluded: ['img', 'node-trigger']
            }}
          >
            {() => (
              <>
                <TransformComponent
                  wrapperClass="w-full h-full"
                  contentClass="w-full h-full"
                >
                  <div
                    className="grid gap-1 mx-auto aspect-square w-full p-4 bg-no-repeat bg-center bg-cover shrink-0"
                    style={{
                      gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
                      backgroundImage: `url(${getStaticUrl("UI/Resource/Texture/BG/UT_BG_FWindow_Daevanion.webp")})`
                    }}
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
                              placement="top"
                              delay={100}
                              closeDelay={0}
                              disableAnimation
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
                            >
                              <div className="w-full h-full flex items-center justify-center cursor-help node-trigger">
                                <img
                                  src={getStaticUrl(icon)}
                                  alt={node.grade}
                                  className={`w-full h-full object-contain transition-transform hover:scale-110 hover:z-50 active:scale-95 ${!isNodeOpen && node.grade !== 'None' ? 'opacity-60 grayscale-[0.5]' : ''}`}
                                  draggable={false}
                                />
                              </div>
                            </AdaptiveTooltip>
                          </div>
                        );
                      })
                    ))}
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-base font-bold text-default-800">守护力概览</h3>
      </div>

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
        hideCloseButton
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-row justify-between items-center pb-0">
                <span>{info.boards.find(b => b.id === selectedBoard)?.name || "守护力"}</span>
                {currentStaticBoard && !boardsLoading && (
                  <Popover placement="bottom-end">
                    <PopoverTrigger>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        className="h-8 bg-primary/10 hover:bg-primary/20 text-primary border-none shadow-none"
                      >
                        {t("character:board.stats", "能力值详情")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="bg-character-equipment border-1 border-crafting-border shadow-xl p-0">
                      <div className="p-3 min-w-[240px] max-w-[320px]">
                        <div className="space-y-4 overflow-y-auto no-scrollbar">
                          {currentStats.length > 0 && (
                            <div>
                              <div className="grid grid-cols-1 gap-1">
                                {currentStats.map(stat => (
                                  <div key={stat.type} className="flex justify-between text-xs border-b border-white/5 pb-1">
                                    <span className="text-default-700">{stat.name}</span>
                                    <span className="font-bold text-foreground">+{stat.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {currentSkills.length > 0 && (
                            <div>
                              <div className="text-xs font-bold mb-2 text-primary">技能合计</div>
                              <div className="grid grid-cols-1 gap-1">
                                {currentSkills.map(skill => (
                                  <div key={skill.id} className="flex justify-between text-xs border-b border-white/5 pb-1">
                                    <span className="text-default-700">{skill.name}</span>
                                    <span className="font-bold text-foreground">+Lv.{skill.level}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {currentStats.length === 0 && currentSkills.length === 0 && (
                            <div className="text-center text-xs text-default-500 py-4">
                              暂无已激活的属性
                            </div>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </ModalHeader>
              <ModalBody>
                {renderBoardGrid()}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default React.memo(CharacterBoards);
