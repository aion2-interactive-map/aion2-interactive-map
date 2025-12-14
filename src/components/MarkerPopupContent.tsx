// src/components/MarkerPopupContent.tsx
import React, {useState} from "react";
import {Trans, useTranslation} from "react-i18next";
import {Button, Card, Modal, ModalContent, ModalBody, Divider, Input} from "@heroui/react";
import EmblaCarouselThumbs from "./EmblaCarousel/EmblaCarouselThumbs.tsx";
import EmblaCarouselGallery from "./EmblaCarousel/EmblaCarouselGallery.tsx";
import {getCdnUrl} from "../utils/url.ts";
import {useUser} from "@/context/UserContext.tsx";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCommentDots} from "@fortawesome/free-solid-svg-icons";
import {useGameMap} from "@/context/GameMapContext.tsx";
import type {CommentInstance, MarkerWithTranslations, UserMarkerInstance} from "@/types/game.ts";
import DOMPurify from "dompurify";
import {useGameData} from "@/context/GameDataContext.tsx";
import {useMarkers} from "@/context/MarkersContext.tsx";
import {useUserMarkers} from "@/context/UserMarkersContext.tsx";
import {v4 as uuidv4} from "uuid";

type Props = {
  marker: MarkerWithTranslations;
};

function safeHTML(input: string) {
  return {__html: DOMPurify.sanitize(input)};
}

const MarkerPopupContent: React.FC<Props> = ({
                                               marker,
                                             }) => {
  const {selectedMap, types} = useGameMap();
  const {allSubtypes} = useGameData();
  const regionNs = `regions/${selectedMap?.name}`;
  const {t} = useTranslation([regionNs]);
  const {user, setUserModalOpen, fetchWithAuth} = useUser();
  const {completedBySubtype, toggleMarkerCompleted} = useMarkers();
  const {setEditingMarker, userMarkersByMarkerId} = useUserMarkers();

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<CommentInstance[]>([]);

  if (!selectedMap) return null;

  const hasImages = marker.images && marker.images.length > 0;
  const resolvedSmallImages = marker.images?.map(image => getCdnUrl(image + ".small.webp"));
  const resolvedNormalImages = marker.images?.map(image => getCdnUrl(image + ".normal.webp"));

  const sub = allSubtypes.get(marker.subtype);
  const cat = types.find((c) => c.name === sub?.category);

  // Category & subtype labels from types namespace (fully-qualified keys)
  const categoryLabel = t(
    `types:categories.${cat?.name}.name`,
  );
  const subtypeLabel = t(
    `types:subtypes.${sub?.name}.name`,
  );
  const regionKeyPrefix = `${regionNs}:${marker.region}`;
  const regionLabel = marker.region ? t(`${regionKeyPrefix}.name`) : "";
  const canComplete = !!sub?.canComplete;

  let name = marker.localizedName;
  if (!name) {
    if (!marker.name || cat?.name == "collection") {
      name = subtypeLabel;
    } else {
      name = marker.name;
    }
  }

  const description = marker.localizedDescription || "";


  let isCompleted = false;
  if (sub?.name && completedBySubtype[sub.name]) {
    const completedSet = completedBySubtype[sub.name];
    isCompleted = completedSet.has(marker.indexInSubtype);
  }

  const handleListComment = async () => {
    const res = await fetchWithAuth(`/maps/${selectedMap?.name}/markers/${marker.id}/comments`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (!data.data || data?.errorCode != "Success") return;
    console.log(data.data);
    setComments(data.data.results);
  }

  const handleSubmitComment = async () => {
    console.log("Comment submit:", commentText);
    if (!commentText) return;
    const res = await fetchWithAuth(`/maps/${selectedMap?.name}/markers/${marker.id}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: commentText,
      })
    });
    if (!res.ok) return;
    // const data = await res.json();
    await handleListComment();
    setCommentText("");
    // setShowCommentInput(false);
  }

  const handleEdit = () => {
    let userMarker: UserMarkerInstance
    if (userMarkersByMarkerId[marker.id]) {
      userMarker = {
        ...userMarkersByMarkerId[marker.id]
      };
      if (!userMarker.image) {
        userMarker.image = marker.images ? marker.images[0] + ".full" : "";
      }
    } else {
      userMarker = {
        id: uuidv4(),
        markerId: marker.id,
        subtype: sub?.id || "",
        mapId: selectedMap.id,
        x: marker.x,
        y: marker.y,
        name: marker.localizedName,
        description: marker.localizedDescription || "",
        image: marker.images ? marker.images[0] + ".full" : "",
        type: "feedback",
      };
    }
    setEditingMarker(userMarker);
  }


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
      <div>
        <div className="text-[18px] leading-[18px] font-bold">{name}</div>
        {marker.contributors.length > 0 && (
          <div className="text-[14px] leading-[14px] mt-2">
            <Trans
              t={t}
              i18nKey="common:markerActions.providedBy"
              defaults="This location is provided by <emph>{{contributor}}</emph>"
              values={{
                contributor: marker.contributors.join(", ")
              }}
              components={{
                emph: <span className="text-success-600"/>
              }}
            />
          </div>
        )}
      </div>

      {/* Category / subtype + coordinates */}
      <div className="text-[14px] leading-[14px]">
        {categoryLabel} / {subtypeLabel}{" "}
        <span className="opacity-80">
          ({marker.x.toFixed(0)}, {marker.y.toFixed(0)})
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

      {/* 🔹 Login / Register prompt (only when user NOT logged in) */}
      {!user && (
        <div className="text-[14px] leading-[14px] flex items-center justify-between">
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => setUserModalOpen(true)}
          >
            {t("common:auth.loginPrompt", "You can submit issue after login!")}
          </button>
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => setUserModalOpen(true)}
          >
            {t("common:auth.loginGo", "Go to login")} &gt;
          </button>
        </div>
      )}

      <Divider/>


      <div className="flex gap-6">
        {/*LEFT BUTTON — only when user != null */}
        <div className="flex-1">
          {user && (
            <Button
              size="sm"
              variant="light"
              color="default"
              onPress={async () => {
                if (!showCommentInput) {
                  await handleListComment();
                }
                setShowCommentInput(!showCommentInput);
              }}
              startContent={<FontAwesomeIcon icon={faCommentDots} className="text-sm"/>}
            >
              {t("common:markerActions:comments", "Comments")}
            </Button>
          )}
        </div>
        <div className="flex-1">
          {user && (
            <Button
              size="sm"
              color="danger"
              variant="flat"
              // className="shrink-0"
              onPress={handleEdit}
            >
              {t("common:markerActions.feedback", "Marker Feedback")}
            </Button>
          )}
        </div>

        {/* RIGHT BUTTON — only when canComplete */}
        <div className="flex-1">
          {canComplete && (
            <Button
              size="sm"
              variant="flat"
              color={isCompleted ? "success" : "primary"}
              onPress={() => {
                // if (!isCompleted) popupRef?.current?.close();
                toggleMarkerCompleted(marker);
              }}
            >
              {isCompleted
                ? t("common:markerActions:markNotCompleted", "Completed")
                : t("common:markerActions:markCompleted", "Mark as completed")}
            </Button>
          )}
        </div>
      </div>

      {/* === Comment Input Section (flows normally) === */}
      {showCommentInput && (
        <div className="flex flex-col gap-2">
          {comments.length > 0 && (
            <div className="flex flex-col gap-3">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-md text-sm leading-snug"
                >
                  {/* Content (HTML-sanitized) */}
                  <div
                    className="text-foreground"
                    dangerouslySetInnerHTML={safeHTML(c.content)}
                  />

                  {/* Created time */}
                  <div className="text-xs text-default-700 mt-1">
                    {new Date(c.createdAt).toLocaleString()}
                  </div>

                </div>
              ))}
            </div>
          )}

          <Input
            placeholder={t("common:markerActions:enterComment", "Write a comment…")}
            value={commentText}
            onValueChange={setCommentText}
            radius="sm"
            size="sm"
            className="w-full mb-3"
          />

          <div className="flex justify-end">
            <Button
              size="sm"
              color="primary"
              radius="sm"
              onPress={handleSubmitComment}
              className="text-background"
            >
              {t("common:ui.submit", "Submit")}
            </Button>
          </div>
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
              <div
                className="relative w-[90vw] max-w-5xl h-[80vh] bg-black/60 dark:bg-black/70 rounded-xl overflow-hidden backdrop-blur-md p-4">
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
