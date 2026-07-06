import type { CSSProperties } from "react"
import { cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gamemap/ui"

export interface ShellMapSelectProps {
  maps: { id: string; label: string }[]
  activeMapId: string
  onSelectMap: (id: string) => void
  placeholder?: string
  barStyle?: CSSProperties
  classNames?: {
    wrapper?: string
    bar?: string
    trigger?: string
    content?: string
    item?: string
  }
}

const defaultBarStyle: CSSProperties = {
  background:
    "linear-gradient(90deg, rgba(190,211,222,0) 0%, rgba(190,211,222,0.5) 54%, rgba(190,211,222,0) 100%)",
  borderImage:
    "linear-gradient(90deg, rgba(165,187,200,0), rgba(165,187,200,1), rgba(165,187,200,0)) 1",
}

export function ShellMapSelect({
  maps,
  activeMapId,
  onSelectMap,
  placeholder,
  barStyle,
  classNames,
}: ShellMapSelectProps) {
  return (
    <div className={cn("flex w-full justify-center", classNames?.wrapper)}>
      <div
        className={cn(
          "flex h-[38px] w-[314px] items-center justify-center rounded-none border border-transparent",
          classNames?.bar,
        )}
        style={barStyle ?? defaultBarStyle}
      >
        <Select value={activeMapId} onValueChange={onSelectMap}>
          <SelectTrigger
            data-testid="map-select"
            size="sm"
            className={cn(
              "w-auto max-w-[260px] justify-center gap-2 border-transparent bg-transparent px-2 py-1 text-lg font-medium leading-[18px] text-foreground shadow-none hover:bg-transparent focus-visible:ring-0 data-[state=open]:bg-transparent",
              classNames?.trigger,
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className={cn("rounded-none", classNames?.content)}>
            {maps.map((m) => (
              <SelectItem key={m.id} value={m.id} data-testid={`map-option-${m.id}`} className={classNames?.item}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
