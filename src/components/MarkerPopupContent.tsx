// src/components/MarkerPopupContent.tsx
import React, {useState} from "react";
import { useTranslation } from "react-i18next";
import {Button, Card, Modal, ModalContent, ModalBody, Divider} from "@heroui/react";
import EmblaCarouselThumbs from "./EmblaCarousel/EmblaCarouselThumbs.tsx";
import EmblaCarouselGallery from "./EmblaCarousel/EmblaCarouselGallery.tsx";
import {getStaticUrl} from "../utils/url.ts";

type Props = {
  name: string;
  categoryLabel: string;
  subtypeLabel: string;
  regionLabel: string;
  x: number;
  y: number;
  images: string[];
  description: string;
  canComplete: boolean;
  completed: boolean;
  onToggleCompleted: () => void;
};

const MarkerPopupContent: React.FC<Props> = ({
                                               name,
                                               categoryLabel,
                                               subtypeLabel,
                                               regionLabel,
                                               x,
                                               y,
                                               images,
                                               description,
                                               canComplete,
                                               completed,
                                               onToggleCompleted,
                                             }) => {
  const { t } = useTranslation();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const hasImages = images && images.length > 0;
  const resolvedSmallImages = images?.map(image => getStaticUrl(image + ".small.webp"));
  const resolvedNormalImages = images?.map(image => getStaticUrl(image + ".normal.webp"));

  return (
    <Card
      className="
      w-[360px]
      p-5 text-xs leading-snug
      text-foreground
      bg-sidebar
      space-y-5
    "
      radius="sm"
    >
      {/* Title */}
      <div className="text-[18px] leading-[18px] font-bold">{name}</div>

      {/* Category / subtype + coordinates */}
      <div className="text-[14px] leading-[14px]">
        {categoryLabel} / {subtypeLabel}{" "}
        <span className="opacity-80">
          ({x.toFixed(0)}, {y.toFixed(0)})
        </span>
        {regionLabel ? ` / ${regionLabel}` : null}
      </div>

      <Divider/>

      {/* Description */}
      {description && (<div className="text-[14px] leading-[14px]">{description}</div>)}

      {hasImages && (
        <div className="w-full h-28 rounded-md ">
          <EmblaCarouselThumbs
            images={resolvedSmallImages}
            selectedIndex={selectedIndex}
            onSelect={(idx) => {
              setSelectedIndex(idx);
              setIsGalleryOpen(true);
            }}
          />
        </div>
      )}

      <Divider />

      {canComplete && (
        <div className="flex">
          <Button
            size="sm"
            variant="flat"
            color={completed ? "success" : "primary"}
            onPress={onToggleCompleted}
          >
            {completed
              ? t("common:markerActions:markNotCompleted", "Completed")
              : t("common:markerActions:markCompleted", "Mark as completed")}
          </Button>
        </div>
      )}

      <Modal
        isOpen={isGalleryOpen}
        onOpenChange={(open) => setIsGalleryOpen(open)}
        size="5xl"
        backdrop="blur"
        placement="center"
        isDismissable
        hideCloseButton
        classNames={{
          wrapper: "z-[20000]", // stay above map & tooltips
          base: "bg-transparent shadow-none",
        }}
      >
        <ModalContent>
          {() => (
            <ModalBody className="p-0 flex items-center justify-center">
              <div className="relative w-[90vw] max-w-5xl h-[80vh] bg-black/60 dark:bg-black/70 rounded-xl overflow-hidden backdrop-blur-md p-4">
                {/* Close button in top-right of the modal */}
                <button
                  type="button"
                  onClick={() => setIsGalleryOpen(false)}
                  className="
                    absolute top-3 right-3 z-20
                    inline-flex h-8 w-8 items-center justify-center
                    rounded-full
                    bg-black/60 text-white
                    hover:bg-black/80
                    dark:bg-white/80 dark:text-black dark:hover:bg-white
                    shadow-md
                  "
                  aria-label="Close gallery"
                >
                  ✕
                </button>

                <EmblaCarouselGallery
                  images={resolvedNormalImages}
                  selectedIndex={selectedIndex}
                  onSelect={setSelectedIndex}
                />
              </div>

            </ModalBody>
          )}
        </ModalContent>
      </Modal>

    </Card>
  );
};

export default MarkerPopupContent;
