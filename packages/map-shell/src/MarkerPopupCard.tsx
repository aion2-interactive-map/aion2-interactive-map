import type { ReactNode } from "react"
import { Card, CardContent, cn } from "@gamemap/ui"
import { IdLabel, type IdLabelValue } from "./IdLabel"

export type MarkerPopupCardProps = {
  idLabel?: IdLabelValue;
  name: string
  metaLine?: string
  description?: string
  noDescriptionLabel?: string
  images?: string[]
  children?: ReactNode
  className?: string
}

export function MarkerPopupCard({
  idLabel,
  name, metaLine, description, noDescriptionLabel, images, children, className,
}: MarkerPopupCardProps) {
  return (
    <Card
      data-testid="marker-popup-card"
      className={cn(
        "gm-popup-card w-[320px] gap-0 py-0 rounded-[10px] border-border bg-card text-card-foreground shadow-lg",
        className,
      )}
    >
      <CardContent className="flex flex-col px-4 py-4">
        <div className="flex items-baseline gap-2">
          <span className="text-[18px] font-bold leading-snug text-[#3D3D3D] dark:text-white">
            {name}
          </span>
          {idLabel && <IdLabel value={idLabel} className="px-1.5 py-0.5 text-[12px]" />}
        </div>
        {metaLine ? (
          <div className="mt-2 text-[14px] leading-tight text-[rgba(0,0,0,0.6)] dark:text-[rgba(255,255,255,0.6)]">
            {metaLine}
          </div>
        ) : null}
        <hr className="my-3 border-0 border-t border-border" />
        {description ? (
          <div className="text-[14px] leading-relaxed whitespace-pre-line text-[#3D3D3D] dark:text-white">
            {description}
          </div>
        ) : (
          <div className="text-[14px] leading-relaxed text-[rgba(0,0,0,0.35)] italic dark:text-[rgba(255,255,255,0.35)]">
            {noDescriptionLabel ?? ""}
          </div>
        )}
        {images?.length ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {images.map((src, i) => (
              <img key={`${src}-${i}`} src={src} alt="" loading="lazy"
                className="aspect-square w-full rounded-md object-cover" />
            ))}
          </div>
        ) : null}
        {children}
      </CardContent>
    </Card>
  )
}
