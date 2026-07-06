import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, X, Zap } from 'lucide-react'
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@gamemap/ui'
import type { BreedingPal, NameMap } from '../../lib/breeding'
import { palIconUrl } from '../../lib/breeding'
import { formatPalId, palIdText } from '../../lib/palId'

function PalIcon({ pal }: { pal: BreedingPal }) {
  return (
    <img
      src={palIconUrl(pal.icon)}
      alt=""
      loading="lazy"
      className={cn(
        'size-6 shrink-0 rounded-full bg-black/5 object-contain dark:bg-white/10',
        pal.legendary && 'ring-2 ring-amber-400 shadow-[0_0_6px_1px_rgba(251,191,36,0.55)]',
      )}
    />
  )
}

function PalMeta({ pal }: { pal: BreedingPal }) {
  const id = formatPalId(pal.zukanIndex, pal.zukanIndexSuffix)
  return (
    <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
      {id ? (
        <span>
          {id.text}
          {id.accent ? <span className="text-primary">{id.accent}</span> : null}
        </span>
      ) : null}
      <span className="inline-flex items-center gap-0.5">
        <Zap className="size-3 shrink-0" />
        {pal.rank}
      </span>
    </span>
  )
}

export interface PalPickerProps {
  label: string
  pals: BreedingPal[]
  names: NameMap
  value: string | null
  onChange: (id: string | null) => void
  labels: { anyPal: string; searchPal: string; noPalFound: string }
}

export function PalPicker({ label, pals, names, value, onChange, labels }: PalPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = value ? pals.find((p) => p.id === value) ?? null : null

  // cmdk filters on each item's `value`; index name + id so both are searchable.
  const searchText = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of pals) {
      const id = formatPalId(p.zukanIndex, p.zukanIndexSuffix)
      m.set(p.id, `${names[p.id] ?? p.id} ${p.id} ${palIdText(id) ?? ''}`)
    }
    return m
  }, [pals, names])

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-11 w-full justify-start gap-2 px-2.5 font-normal"
          >
            {selected ? (
              <>
                <PalIcon pal={selected} />
                <span className="truncate">{names[selected.id] ?? selected.id}</span>
                <PalMeta pal={selected} />
              </>
            ) : (
              <span className="text-muted-foreground">{labels.anyPal}</span>
            )}
            {selected ? (
              <span
                role="button"
                tabIndex={-1}
                aria-label={labels.anyPal}
                className="ml-1 rounded p-0.5 hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(null)
                }}
              >
                <X className="size-4 opacity-60" />
              </span>
            ) : (
              <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={labels.searchPal} />
            <CommandList>
              <CommandEmpty>{labels.noPalFound}</CommandEmpty>
              <CommandGroup>
                {pals.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={searchText.get(p.id)}
                    onSelect={() => {
                      onChange(p.id === value ? null : p.id)
                      setOpen(false)
                    }}
                    className="gap-2"
                  >
                    <PalIcon pal={p} />
                    <span className="truncate">{names[p.id] ?? p.id}</span>
                    <PalMeta pal={p} />
                    <Check className={cn('ml-1 size-4 shrink-0', p.id === value ? 'opacity-100' : 'opacity-0')} />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
