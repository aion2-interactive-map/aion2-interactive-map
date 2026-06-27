import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGameMap } from "@/context/GameMapContext";
import { useGameData } from "@/context/GameDataContext";
import { useMarkers } from "@/context/MarkersContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

export default function MarkerTypes() {
  const { types } = useGameMap();
  const {
    visibleSubtypes,
    handleToggleSubtype,
    handleShowAllSubtypes,
    handleHideAllSubtypes,
  } = useGameData();
  const { subtypeCounts, completedCounts, clearMarkerCompleted } = useMarkers();
  const { t } = useTranslation(["types", "common"]);

  const categories = types.filter((c) => c.subtypes.length > 0);
  const allCategoryNames = categories.map((c) => c.name);

  // Controlled so sections open once categories load (avoids uncontrolled
  // defaultValue race where types arrive after first render).
  const [openValues, setOpenValues] = useState<string[]>(allCategoryNames);
  useEffect(() => {
    setOpenValues(allCategoryNames);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCategoryNames.join("|")]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={handleShowAllSubtypes}>
          {t("common:menu.showAllMarkers", "Show all")}
        </Button>
        <Button variant="outline" size="sm" onClick={handleHideAllSubtypes}>
          {t("common:menu.hideAllMarkers", "Hide all")}
        </Button>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full">
            {t("common:menu.clearMarkerCompleted", "Clear completed")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("common:menu.clearMarkerCompleted", "Clear completed")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "common:menu.clearMarkerCompletedConfirm",
                "This will clear all completed markers. This cannot be undone.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common:menu.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => clearMarkerCompleted()}>
              {t("common:menu.confirm", "Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Accordion type="multiple" value={openValues} onValueChange={setOpenValues}>
        {categories.map((category) => (
          <AccordionItem key={category.name} value={category.name}>
            <AccordionTrigger className="text-sm font-semibold">
              {t(`types:categories.${category.name}.name`, category.name)}
            </AccordionTrigger>
            <AccordionContent>
              <ul className="flex flex-col gap-1">
                {category.subtypes.map((sub) => {
                  const total = subtypeCounts[sub.name] ?? 0;
                  const completed = completedCounts[sub.name] ?? 0;
                  const checked = visibleSubtypes?.has(sub.name) ?? false;
                  return (
                    <li
                      key={sub.name}
                      data-testid={`subtype-toggle-${sub.name}`}
                      className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/50 cursor-pointer"
                      onClick={() => handleToggleSubtype(sub.name)}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => handleToggleSubtype(sub.name)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="flex-1 truncate text-sm">
                        {t(`types:subtypes.${sub.name}.name`, sub.name)}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {completed}/{total}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
