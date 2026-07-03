import { useEffect, useState, type MouseEvent, type ReactNode } from "react"
import { Eye, EyeOff } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  cn,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gamemap/ui"
import { deriveEyeState, syncExpanded } from "./filter-logic"

export interface FilterSubtype {
  id: string
  label: string
  active: boolean
  icon?: ReactNode
  badge?: string
}

export interface FilterCategory {
  id: string
  label: string
  icon?: ReactNode
  subtypes: FilterSubtype[]
}

export interface FilterControl {
  id: string
  label: string
  onClick: () => void
  active?: boolean
  testId?: string
}

export interface FilterPanelClassNames {
  root?: string
  controls?: string
  controlButton?: string
  controlButtonActive?: string
  category?: string
  categoryHeader?: string
  categoryEyeToggle?: string
  subtypeGrid?: string
  subtypeButton?: string
  subtypeButtonActive?: string
}

export interface FilterPanelProps {
  categories: FilterCategory[]
  onToggleSubtype: (id: string) => void
  onSetCategory?: (categoryId: string, visible: boolean) => void
  categoryToggleLabels?: { show: string; hide: string }
  controls?: FilterControl[]
  classNames?: FilterPanelClassNames
}

const BUTTON_BASE =
  "flex h-[30px] w-full items-center gap-2 rounded-sm px-2 text-sm font-normal leading-[14px] transition-colors"
const BUTTON_ACTIVE_DEFAULT = "bg-primary text-primary-foreground"
const BUTTON_INACTIVE_DEFAULT = "bg-muted text-foreground"

export function FilterPanel({
  categories,
  onToggleSubtype,
  onSetCategory,
  categoryToggleLabels,
  controls,
  classNames,
}: FilterPanelProps) {
  // All categories expanded by default. Data loads async, so the category set
  // grows over time; keep the expanded set in sync as categories appear while
  // preserving user collapses (same semantics as the aion2 donor).
  const [expanded, setExpanded] = useState<string[]>([])
  const idsKey = categories.map((c) => c.id).join("|")
  useEffect(() => {
    setExpanded((prev) => syncExpanded(prev, categories.map((c) => c.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  return (
    <div className={cn("flex w-full flex-col", classNames?.root)}>
      {controls && controls.length > 0 && (
        <div className={cn("grid grid-cols-2 gap-x-2.5 gap-y-2", classNames?.controls)}>
          {controls.map((control) => {
            const active = control.active === true
            return (
              <button
                key={control.id}
                type="button"
                data-testid={control.testId}
                aria-pressed={control.active}
                onClick={control.onClick}
                className={cn(
                  BUTTON_BASE,
                  active ? BUTTON_ACTIVE_DEFAULT : BUTTON_INACTIVE_DEFAULT,
                  classNames?.controlButton,
                  active && classNames?.controlButtonActive,
                )}
              >
                {control.label}
              </button>
            )
          })}
        </div>
      )}

      <Accordion type="multiple" value={expanded} onValueChange={setExpanded} className="w-full">
        {categories.map((category) => {
          const eyeState = deriveEyeState(category.subtypes)
          const tooltipText =
            eyeState === "all"
              ? (categoryToggleLabels?.hide ?? "")
              : (categoryToggleLabels?.show ?? "")
          const toggleCategory = (e: MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            onSetCategory?.(category.id, eyeState !== "all")
          }

          return (
            <AccordionItem
              key={category.id}
              value={category.id}
              className={cn("border-b-0", classNames?.category)}
            >
              <AccordionTrigger
                className={cn(
                  "cursor-default items-center gap-1 px-0 pt-3 pb-0 hover:no-underline [&>svg]:translate-y-0",
                  classNames?.categoryHeader,
                )}
              >
                <div className="my-2 flex w-full items-center justify-between gap-2 px-0">
                  <div className="flex items-center gap-2">
                    {category.icon && (
                      <span className="flex h-4 w-4 items-center justify-center">
                        {category.icon}
                      </span>
                    )}
                    <span className="text-sm font-medium leading-[14px]">{category.label}</span>
                  </div>

                  {onSetCategory && (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={toggleCategory}
                            aria-label={tooltipText}
                            className={cn(
                              "shrink-0 rounded-sm p-1 transition-opacity hover:bg-black/5 dark:hover:bg-white/10",
                              eyeState === "none" && "opacity-40",
                              classNames?.categoryEyeToggle,
                            )}
                          >
                            {eyeState === "all" ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{tooltipText}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="pt-0 pb-0">
                <div className={cn("grid grid-cols-2 gap-x-2.5 gap-y-2", classNames?.subtypeGrid)}>
                  {category.subtypes.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      data-testid={`subtype-toggle-${sub.id}`}
                      aria-pressed={sub.active}
                      onClick={() => onToggleSubtype(sub.id)}
                      className={cn(
                        BUTTON_BASE,
                        sub.active ? BUTTON_ACTIVE_DEFAULT : BUTTON_INACTIVE_DEFAULT,
                        classNames?.subtypeButton,
                        sub.active && classNames?.subtypeButtonActive,
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="flex min-w-0 items-center gap-1">
                          {sub.icon}
                          <span className="truncate text-left">{sub.label}</span>
                        </span>
                        {sub.badge !== undefined && (
                          <span className="ml-2 shrink-0 text-xs">{sub.badge}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
