import { useTranslation } from "react-i18next";
import { useGameData } from "@/context/GameDataContext";
import { useMarkers } from "@/context/MarkersContext";
import { useUserMarkers } from "@/context/UserMarkersContext";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** A pill-style toggle button matching the Lanhu control cluster. */
function PillButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-8 items-center justify-center rounded-md px-2 text-[13px] font-medium transition-colors",
        active
          ? "bg-[#2E97FF] text-white hover:bg-[#2E97FF]/90"
          : "bg-[#E5F0FF] text-[rgba(0,0,0,0.6)] hover:bg-[#d6e8ff]",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Control cluster under the "Marker Types" header:
 * - Show all / Hide all
 * - Show marker names (Switch)
 * - Show region borders / Show custom markers
 * - Clear completed (AlertDialog)
 */
export default function ControlCluster() {
  const { handleShowAllSubtypes, handleHideAllSubtypes, showBorders, handleToggleBorders } =
    useGameData();
  const { showLabels, setShowLabels, clearMarkerCompleted } = useMarkers();
  const { hideUserMarkers, setHideUserMarkers } = useUserMarkers();
  const { t } = useTranslation(["common"]);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <PillButton active onClick={handleShowAllSubtypes}>
          {t("common:menu.showAllMarkers", "Show all")}
        </PillButton>
        <PillButton onClick={handleHideAllSubtypes}>
          {t("common:menu.hideAllMarkers", "Hide all")}
        </PillButton>
      </div>

      <label className="flex h-8 items-center gap-2 px-1 text-[13px] text-[#3D3D3D]">
        <Switch checked={showLabels} onCheckedChange={setShowLabels} />
        <span>{t("common:menu.showMarkerNames", "Show marker names")}</span>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <PillButton active={showBorders} onClick={handleToggleBorders}>
          {t("common:menu.showBorders", "Show region borders")}
        </PillButton>
        <PillButton
          active={!hideUserMarkers}
          onClick={() => setHideUserMarkers(!hideUserMarkers)}
        >
          {t("common:menu.showCustomMarkers", "Show custom markers")}
        </PillButton>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            className="self-start px-1 text-[12px] text-[rgba(0,0,0,0.45)] underline-offset-2 transition-colors hover:text-[#2E97FF] hover:underline"
          >
            {t("common:menu.clearMarkerCompleted", "Clear completed")}
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("common:menu.clearMarkerCompleted", "Clear completed")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "common:menu.clearMarkerCompletedBody",
                "Do you want to clear all completed marker in this map?",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common:ui.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => clearMarkerCompleted()}>
              {t("common:ui.confirm", "Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
