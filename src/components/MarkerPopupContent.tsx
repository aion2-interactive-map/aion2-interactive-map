// src/components/MarkerPopupContent.tsx
import React, {useState} from "react";
import { useTranslation } from "react-i18next";
import {Button, Card, Modal, ModalContent, ModalBody} from "@heroui/react";
import EmblaCarouselThumbs from "./EmblaCarousel/EmblaCarouselThumbs.tsx";
import EmblaCarouselGallery from "./EmblaCarousel/EmblaCarouselGallery.tsx";
import {getStaticUrl} from "../utils/url.ts";

type Props = {
  name: string;
  categoryLabel: string;
  subtypeLabel: string;
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
  const resolvedSmallImages = images?.map(image => getStaticUrl(image + "_small.webp"));
  const resolvedNormalImages = images?.map(image => getStaticUrl(image + "_normal.webp"));

  return (
    <Card
      className="
      min-w-[260px] max-w-[360px]
      p-3 space-y-2 text-xs leading-snug
      bg-content1 text-foreground
    "
      radius="sm"
    >
      {/* Title */}
      <h3 className="text-sm font-semibold">{name}</h3>

      {/* Category / subtype + coordinates */}
      <p className="text-[11px] text-default-500">
        {categoryLabel} / {subtypeLabel}{" "}
        <span className="opacity-80">
          ({x.toFixed(0)}, {y.toFixed(0)})
        </span>
      </p>

      {hasImages && (
        <div className="w-full h-28 rounded-md bg-black/10 dark:bg-white/10">
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

      {/* Description */}
      <div className="pt-1 border-t border-default-200">
        <p className="text-[11px] text-default-600">{description}</p>
      </div>

      {canComplete && (
        <div className="pt-1">
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
