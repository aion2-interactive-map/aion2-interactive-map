import React, {useState, useEffect, useMemo, useCallback} from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  SelectItem,
  DatePicker,
  Alert,
} from "@heroui/react";
import {now, getLocalTimeZone, parseAbsoluteToLocal, toCalendarDate} from "@internationalized/date";
import {useTranslation} from "react-i18next";
import {I18nProvider} from "@react-aria/i18n";
import {useLeaderboard} from "@/context/LeaderboardContext";
import type {Artifact, ArtifactState, ServerMatching} from "@/types/leaderboard";

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

  const [artifactStates, setArtifactStates] = useState<Record<string, number>>({});
  const [manualRecordTime, setManualRecordTime] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDateUnavailable = useCallback((date: any) => {
    // We want to allow Tuesday (2), Thursday (4), and Saturday (6) in UTC
    // Since we are setting the time to 13:00 UTC, we should check the day in UTC
    // for that specific time.
    // CalendarDate represents a date without a time or timezone.
    // 13:00 UTC on a given CalendarDate is always the same day of the week in UTC
    // as the date itself if we treat it as a UTC date.
    
    // Create a date object at 13:00 UTC on the given calendar date
    const utcDate = new Date(Date.UTC(date.year, date.month - 1, date.day, 13, 0, 0));
    const day = utcDate.getUTCDay();
    return day !== 2 && day !== 4 && day !== 6;
  }, []);

  const getNearestAvailableDate = useCallback(() => {
    const znow = now(getLocalTimeZone());
    let date = toCalendarDate(znow);
    
    // Try current date and then go backwards until we find an available date
    // We limit to 7 days just in case, though 3 should be enough
    for (let i = 0; i < 7; i++) {
        if (!isDateUnavailable(date)) {
            return date;
        }
        date = date.subtract({ days: 1 });
    }
    return toCalendarDate(znow);
  }, [isDateUnavailable]);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (initialState) {
        if (initialState.id) {
          // Update mode
          setManualRecordTime(toCalendarDate(parseAbsoluteToLocal(initialState.recordTime)));
          
          const states: Record<string, number> = {};
          initialState.states.forEach(s => {
            states[s.abyssArtifactId] = s.state;
          });
          setArtifactStates(states);
        } else {
          // Create mode (initialState exists but has no id, it's a template)
          setManualRecordTime(getNearestAvailableDate());
          
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
        setManualRecordTime(getNearestAvailableDate());
        
        const states: Record<string, number> = {};
        mapArtifacts.forEach(a => {
           states[a.id] = 1; // Default to light
        });
        setArtifactStates(states);
      }
    }
  }, [isOpen]); // Only run when modal opens

  const isUpdateMode = useMemo(() => {
    return !!(initialState && initialState.id);
  }, [initialState]);

  const recordTimeForApi = useMemo(() => {
    if (!manualRecordTime) return "";
    // manualRecordTime is a CalendarDate.
    // We want to force it to 13:00 UTC on that specific date.
    const date = new Date(Date.UTC(manualRecordTime.year, manualRecordTime.month - 1, manualRecordTime.day, 13, 0, 0));
    return date.toISOString();
  }, [manualRecordTime]);

  const localTimeDisplay = useMemo(() => {
    const date = new Date();
    date.setUTCHours(13, 0, 0, 0);
    return date.toLocaleTimeString(i18n.language, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }, [i18n.language]);

  const handleSave = async () => {
    const statesData = Object.entries(artifactStates).map(([id, state]) => ({
      abyssArtifactId: id,
      state
    }));

    let result: any = null;
    if (isUpdateMode && initialState) {
        result = await updateArtifactState(seasonId, mapName, initialState.id, {
            states: statesData,
            recordTime: recordTimeForApi
        });
    } else {
        result = await createArtifactState(seasonId, mapName, {
            serverMatchingId: matching.id,
            states: statesData,
            recordTime: recordTimeForApi
        });
    }

    if (result && result.errorCode === "Success") {
      onOpenChange(false);
    } else if (result) {
      if (result.errorCode === "ValidationError") {
        setErrorMessage(t("leaderboard.artifactState.validationError"));
      } else {
        setErrorMessage(result.errorMessage || t("errors.unknown"));
      }
    } else {
      setErrorMessage(t("errors.unknown"));
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
          onSelectionChange={(keys) => {
            const selectedValue = Array.from(keys)[0];
            if (selectedValue !== undefined) {
              handleStateChange(artifact.id, Number(selectedValue));
            }
          }}
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
              {errorMessage && (
                <Alert color="danger" variant="flat" onClose={() => setErrorMessage(null)}>
                  {errorMessage}
                </Alert>
              )}
              <I18nProvider locale={i18n.language}>
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
                  isDateUnavailable={isDateUnavailable}
                  classNames={inputClassNames}
                  description={t("leaderboard.artifactState.timeFixedNote", {time: localTimeDisplay})}
                />
              </I18nProvider>
              
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
