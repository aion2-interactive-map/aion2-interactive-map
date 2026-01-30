import React, {useState, useEffect, useMemo} from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  DatePicker,
  Switch,
} from "@heroui/react";
import {now, getLocalTimeZone, parseAbsoluteToLocal} from "@internationalized/date";
import {useTranslation} from "react-i18next";
import {I18nProvider} from "@react-aria/i18n";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faRotateRight} from "@fortawesome/free-solid-svg-icons";
import {useLeaderboard} from "@/context/LeaderboardContext";
import type {Artifact, ArtifactState, ServerMatching} from "@/types/leaderboard";
import {AdaptiveTooltip} from "@/components/AdaptiveTooltip";

interface ArtifactStateModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  matching: ServerMatching;
  mapName: string;
  artifacts: Artifact[];
  initialState?: ArtifactState | null;
  seasonId: string;
}

const ArtifactStateModal: React.FC<ArtifactStateModalProps> = ({
  isOpen,
  onOpenChange,
  matching,
  mapName,
  initialState,
  seasonId
}) => {
  const {t, i18n} = useTranslation("common");
  const {createArtifactState, updateArtifactState, artifactsByMap} = useLeaderboard();
  
  const mapArtifacts = useMemo(() => {
    return (artifactsByMap[mapName] || []).sort((a, b) => a.order - b.order);
  }, [artifactsByMap, mapName]);

  const [uploadTime, setUploadTime] = useState(now(getLocalTimeZone()));
  const [countdown, setCountdown] = useState("48:00:00");
  const [artifactStates, setArtifactStates] = useState<Record<string, number>>({});
  const [isCountdownMode, setIsCountdownMode] = useState(false);
  const [manualRecordTime, setManualRecordTime] = useState(now(getLocalTimeZone()));

  const calculateFormattedCountdown = (recordTimeStr: string) => {
    const recordTime = new Date(recordTimeStr).getTime();
    const fortyEightHours = 48 * 60 * 60 * 1000;
    const now = Date.now();
    const diff = recordTime + fortyEightHours - now;

    if (diff <= 0) return "48:00:00";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (isOpen) {
      if (initialState) {
        if (initialState.id) {
          // Update mode
          setUploadTime(parseAbsoluteToLocal(initialState.recordTime));
          setCountdown(calculateFormattedCountdown(initialState.recordTime));
          setManualRecordTime(parseAbsoluteToLocal(initialState.recordTime));
          setIsCountdownMode(false);
          
          const states: Record<string, number> = {};
          initialState.states.forEach(s => {
            states[s.abyssArtifactId] = s.state;
          });
          setArtifactStates(states);
        } else {
          // Create mode (initialState exists but has no id, it's a template)
          setUploadTime(now(getLocalTimeZone()));
          setCountdown("48:00:00");
          setManualRecordTime(now(getLocalTimeZone()));
          setIsCountdownMode(true);
          
          const states: Record<string, number> = {};
          if (initialState.states) {
            initialState.states.forEach(s => {
              states[s.abyssArtifactId] = s.state;
            });
          } else {
            mapArtifacts.forEach(a => {
              states[a.id] = 1; // Default to light
            });
          }
          setArtifactStates(states);
        }
      } else {
        // Create mode
        setUploadTime(now(getLocalTimeZone()));
        setCountdown("48:00:00");
        setManualRecordTime(now(getLocalTimeZone()));
        setIsCountdownMode(true);
        
        const states: Record<string, number> = {};
        mapArtifacts.forEach(a => {
           states[a.id] = 1; // Default to light
        });
        setArtifactStates(states);
      }
    }
  }, [isOpen, initialState, mapArtifacts]);

  const isUpdateMode = useMemo(() => {
    return !!(initialState && initialState.id);
  }, [initialState]);

  const disabledTimeValue = useMemo(() => {
    if (!isCountdownMode) {
      return manualRecordTime;
    }
    if (!uploadTime || !countdown) return null;
    try {
      const uploadDate = uploadTime.toDate();
      const [h, m, s] = countdown.split(":").map(Number);
      const countdownMs = ((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) * 1000;
      const fortyEightHoursMs = 48 * 3600 * 1000;

      const recordDateMs = uploadDate.getTime() + countdownMs - fortyEightHoursMs;
      return parseAbsoluteToLocal(new Date(recordDateMs).toISOString());
    } catch (e) {
      return null;
    }
  }, [uploadTime, countdown, isCountdownMode, manualRecordTime]);

  const recordTimeForApi = useMemo(() => {
    if (!isCountdownMode) {
      return manualRecordTime ? new Date(manualRecordTime.toDate()).toISOString() : "";
    }
    if (!uploadTime || !countdown) return "";
    try {
      const uploadDate = uploadTime.toDate();
      const [h, m, s] = countdown.split(":").map(Number);
      const countdownMs = ((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) * 1000;
      const fortyEightHoursMs = 48 * 3600 * 1000;

      const recordDateMs = uploadDate.getTime() + countdownMs - fortyEightHoursMs;
      return new Date(recordDateMs).toISOString();
    } catch (e) {
      return "";
    }
  }, [uploadTime, countdown, isCountdownMode, manualRecordTime]);

  const handleSave = async () => {
    const statesData = Object.entries(artifactStates).map(([id, state]) => ({
      abyssArtifactId: id,
      state
    }));

    let success = false;
    if (isUpdateMode && initialState) {
        success = await updateArtifactState(seasonId, mapName, initialState.id, {
            states: statesData,
            recordTime: recordTimeForApi
        });
    } else {
        success = await createArtifactState(seasonId, mapName, {
            serverMatchingId: matching.id,
            states: statesData,
            recordTime: recordTimeForApi
        });
    }

    if (success) {
      onOpenChange(false);
    }
  };

  const handleStateChange = (artifactId: string, state: number) => {
    setArtifactStates(prev => ({...prev, [artifactId]: state}));
  };

  const renderArtifactSelect = (artifact: Artifact) => {
    const artifactName = t(`markers/${artifact.marker.mapId}:${artifact.markerId}.name`, artifact.marker.name);
    return (
      <div key={artifact.id} className="flex items-center justify-between gap-4">
        <span className="text-sm flex-1">{artifactName}</span>
        <Select
          size="sm"
          className="w-[100px]"
          selectedKeys={[String(artifactStates[artifact.id] || 1)]}
          onSelectionChange={(keys) => handleStateChange(artifact.id, Number(Array.from(keys)[0]))}
          disallowEmptySelection
          classNames={inputClassNames}
          popoverProps={{
            radius: "none",
          }}
          listboxProps={commonListboxProps}
        >
          <SelectItem key="1" textValue={t("leaderboard.artifactState.light")}>{t("leaderboard.artifactState.light")}</SelectItem>
          <SelectItem key="2" textValue={t("leaderboard.artifactState.dark")}>{t("leaderboard.artifactState.dark")}</SelectItem>
        </Select>
      </div>
    );
  };

  const inputClassNames = {
    inputWrapper: "!bg-character-card hover:!bg-character-card focus:!bg-character-card !transition-none border-crafting-border border-1 shadow-none rounded-sm group-data-[hover=true]:!bg-character-card group-data-[focus=true]:!bg-character-card group-data-[focus-visible=true]:!bg-character-card min-h-[36px]",
    popoverContent: "rounded-none p-0",
    segment: "text-foreground",
    trigger: "!bg-character-card hover:!bg-character-card focus:!bg-character-card !transition-none border-crafting-border border-1 shadow-none rounded-sm group-data-[hover=true]:!bg-character-card group-data-[focus=true]:!bg-character-card group-data-[focus-visible=true]:!bg-character-card min-h-[36px]",
    innerWrapper: "py-0",
  };

  const commonListboxProps = {
    itemClasses: {
      base: "rounded-none",
    },
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="xl" classNames={{
      base: "bg-character-equipment",
    }}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>
              {isUpdateMode ? t("leaderboard.artifactState.update") : t("leaderboard.artifactState.create")}
              {` - ${matching.server1.serverName} VS ${matching.server2.serverName}`}
            </ModalHeader>
            <ModalBody className="gap-4">
              <div className="flex items-center gap-2 mb-2">
                <Switch 
                  isSelected={isCountdownMode} 
                  onValueChange={setIsCountdownMode}
                  size="sm"
                >
                  {t("leaderboard.artifactState.countdownMode")}
                </Switch>
              </div>
              <I18nProvider locale={i18n.language}>
                {isCountdownMode ? (
                  <>
                    <div className="relative group/picker">
                      <DatePicker
                        label={t("leaderboard.artifactState.uploadTime")}
                        hideTimeZone
                        showMonthAndYearPickers
                        value={uploadTime}
                        onChange={(value) => {
                          if (value) {
                            setUploadTime(value);
                          }
                        }}
                        classNames={inputClassNames}
                        granularity="second"
                      />
                      <AdaptiveTooltip content={t("common:leaderboard.resetToNow", "重置到当前时间")}>
                        <Button
                          size="sm"
                          variant="flat"
                          isIconOnly
                          className="absolute right-10 bottom-2 z-20 h-6 w-6 min-w-0 bg-transparent"
                          onClick={() => {
                            setUploadTime(now(getLocalTimeZone()));
                          }}
                        >
                          <FontAwesomeIcon icon={faRotateRight} className="text-[12px]"/>
                        </Button>
                      </AdaptiveTooltip>
                    </div>
                    <Input
                      label={t("leaderboard.artifactState.countdown")}
                      placeholder="hh:mm:ss"
                      value={countdown}
                      onChange={(e) => setCountdown(e.target.value)}
                      classNames={inputClassNames}
                    />
                  </>
                ) : (
                  <DatePicker
                    label={t("leaderboard.artifactState.recordTime")}
                    hideTimeZone
                    showMonthAndYearPickers
                    value={manualRecordTime}
                    onChange={(value) => {
                      if (value) {
                        setManualRecordTime(value);
                      }
                    }}
                    classNames={inputClassNames}
                    granularity="second"
                  />
                )}
              </I18nProvider>
              
              {isCountdownMode && (
                <I18nProvider locale={i18n.language}>
                  <DatePicker
                    label={t("leaderboard.artifactState.recordTime")}
                    hideTimeZone
                    showMonthAndYearPickers
                    value={disabledTimeValue}
                    isDisabled
                    classNames={inputClassNames}
                    granularity="second"
                  />
                </I18nProvider>
              )}
              
              <div className="flex flex-col gap-2 mt-2">
                <p className="font-bold">{t(`maps:${mapName}.description`)}</p>
                {mapArtifacts.map(renderArtifactSelect)}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>
                {t("leaderboard.artifactState.cancel")}
              </Button>
              <Button color="primary" onPress={handleSave}>
                {t("leaderboard.artifactState.save")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ArtifactStateModal;
