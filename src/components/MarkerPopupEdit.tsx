// src/components/MarkerPopupEdit.tsx
import React, {useState, useEffect} from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Button,
  Select,
  SelectItem, Divider, Tooltip
} from "@heroui/react";
import {useUserMarkers} from "@/context/UserMarkersContext";
import {useTranslation} from "react-i18next";
import {useGameMap} from "@/context/GameMapContext.tsx";
import {useUser} from "@/context/UserContext.tsx";
import type {UserMarkerInstance, UserMarkerLocalType} from "@/types/game.ts";
import {SingleImageUploader} from "@/components/SingleImageUploader.tsx";
import {getCdnUrl, getStaticUrl} from "@/utils/url.ts";
import {
  USER_MARKER_LOCAL_ICON_ORDER,
  USER_MARKER_LOCAL_ICON_MAP,
} from "@/utils/userMarkerLocalIcons.ts";


const MarkerPopupEdit: React.FC = () => {
  const {
    editingMarker,
    setEditingMarker,
    createMarkerRemote,
    updateMarker,
    deleteMarker,
  } = useUserMarkers();

  const {types, selectedMap} = useGameMap();
  const {fetchWithAuth, user, setUserModalOpen} = useUser();
  const {t} = useTranslation();

  // const [tab, setTab] = useState<"local" | "feedback">("local");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // two-level select state
  const [selectedLocalType, setSelectedLocalType] = useState<UserMarkerLocalType | "">("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubtype, setSelectedSubtype] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const imageUrl = editingMarker?.image ? getCdnUrl(editingMarker.image + ".webp") : "";

  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // when marker or types change, sync local state
  useEffect(() => {
    if (!editingMarker) return;

    setName(editingMarker.name ?? "");
    setDescription(editingMarker.description ?? "");
    setSelectedLocalType(editingMarker.localType ?? "");
    // setTab(editingMarker.type ?? "local");

    // find category that contains marker's subtype
    const currentSubtype = editingMarker.subtype ?? "";
    let foundCategory = "";
    for (const cat of types) {
      if (cat.subtypes.some((s) => s.id === currentSubtype)) {
        foundCategory = cat.id;
        break;
      }
    }
    setSelectedCategory(foundCategory);
    setSelectedSubtype(currentSubtype);
    setUploadError(null);
    setImageFile(null);
  }, [editingMarker, types]);

  if (!editingMarker) return null;

  const subtypesInCategory =
    types.find((cat) => cat.id === selectedCategory)?.subtypes ?? [];

  const inputClassNames = {
    inputWrapper: ` bg-input hover:!bg-input focus:!bg-input transition-none
                    group-data-[hover=true]:!bg-input
                    group-data-[focus=true]:!bg-input
                    group-data-[focus-visible=true]:!bg-input
                    group-data-[invalid=true]:!bg-input
                  `,
    innerWrapper: `h-10 py-0`
  }


  const handleUpload = async () => {
    if (isUploading) return;
    const errorMessage = t("common:errors.uploadFailed", "Upload failed. Please try again.")
    const finalSubtype = selectedSubtype || editingMarker.subtype || "";
    console.log(finalSubtype)
    setIsUploading(true);
    setUploadError(null);

    try {
      const form = new FormData();
      if (imageFile) {
        form.append("file", imageFile);
      }

      if (editingMarker.status) {
        form.append("subtype_id", finalSubtype);
        form.append("name", name);
        form.append("description", description);
        const res = await fetchWithAuth(`/maps/${selectedMap?.name}/marker_feedbacks/${editingMarker.id}`, {
          method: "PATCH",
          body: form
        });
        if (!res.ok) {
          setUploadError(errorMessage);
          return;
        }
        const data = await res.json();
        if (data.errorCode !== "Success") {
          setUploadError(`${errorMessage} ${data.errorCode}: ${data.errorMessage}`);
        }

        const markerData = data.data;
        updateMarker({
          ...editingMarker,
          name: markerData.name,
          description: markerData.description,
          subtype: markerData.subtypeId,
          image: markerData.image?.s3Key || "",
          type: markerData.type === "create" ? "uploaded" : "feedback",
          status: markerData.status,
          reply: markerData.reply,
        });
        setEditingMarker(null);

      } else {
        // create marker feedback
        form.append("x", String(Math.round(editingMarker.x)));
        form.append("y", String(Math.round(editingMarker.y)));
        form.append("subtype_id", finalSubtype);
        form.append("name", name);
        form.append("description", description);
        if (editingMarker.type === "feedback") {
          form.append("type", "update")
          form.append("marker_id", editingMarker.markerId);
        } else {
          form.append("type", "create");
        }

        const res = await fetchWithAuth(`/maps/${selectedMap?.name}/marker_feedbacks`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          setUploadError(errorMessage);
          return;
        }
        const data = await res.json();
        if (data.errorCode !== "Success") {
          setUploadError(`${errorMessage} ${data.errorCode}: ${data.errorMessage}`);
        }

        // remove local marker and add the remote one
        deleteMarker(editingMarker.id);
        const markerData = data.data;

        const marker: UserMarkerInstance = {
          id: markerData.id,
          markerId: markerData.markerId || "",
          subtype: markerData.subtypeId,
          mapId: markerData.mapId,
          x: markerData.x,
          y: markerData.y,
          name: markerData.name,
          description: markerData.description,
          image: markerData.image?.s3Key || "",
          type: markerData.type === "create" ? "uploaded" : "feedback",
          status: markerData.status,
          reply: markerData.reply,
        };
        createMarkerRemote(marker);
      }
    } catch (err) {
      console.error(err);
      setUploadError(
        t(
          "common:errors.network",
          "Network error. Please check your connection and try again.",
        ),
      );
    } finally {
      setIsUploading(false);
    }
  }

  const handleSave = async () => {
    const finalSubtype = selectedSubtype || editingMarker.subtype || "";
    updateMarker({
      ...editingMarker,
      x: Math.round(editingMarker.x),
      y: Math.round(editingMarker.y),
      subtype: finalSubtype,
      name: name,
      description: description,
      localType: selectedLocalType || undefined,
    });
    setEditingMarker(null);
  }

  const handleDelete = async () => {
    if (isDeleting) return;
    const errorMessage = t("common:errors.deleteFailed", "Delete failed. Please try again.")
    setIsDeleting(true);
    try {
      if (editingMarker.type === "uploaded") {
        const res = await fetchWithAuth(`/maps/${selectedMap?.name}/marker_feedbacks/${editingMarker.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          setUploadError(errorMessage);
          return;
        }
      }
      deleteMarker(editingMarker.id);
    } catch (err) {
      console.error(err);
      setUploadError(
        t(
          "common:errors.network",
          "Network error. Please check your connection and try again.",
        ),
      );
    } finally {
      setIsDeleting(false);
    }

  }

  return (
    <Modal
      isOpen
      onOpenChange={() => setEditingMarker(null)}
      placement="center"
      size="md"
      classNames={{wrapper: "z-[30000]"}}
      hideCloseButton
      backdrop="transparent"
    >
      <ModalContent className="bg-sidebar">
        {() => (
          <>
            <ModalHeader className="flex items-center justify-between gap-3">
              <span className="text-base font-semibold">
                {editingMarker?.type === "feedback" ? t("common:markerActions.feedback", "Marker Feedback") : t("common:markerActions.editUserMarker", "Edit User Marker")}
              </span>
              {editingMarker?.type !== "feedback" && (
                <span className="text-sm text-default-700">
                  {editingMarker?.type === "uploaded" ? t("common:markerActions.uploaded", "Uploaded marker") : t("common:markerActions.local", "Local marker")}
                </span>
              )}
            </ModalHeader>

            <ModalBody className="flex flex-col gap-3">
              {uploadError && (
                <div
                  className="mt-1 rounded-md border border-danger-500/60 bg-danger-500/10 px-3 py-2 text-[13px] text-danger-500">
                  {uploadError}
                </div>
              )}
              {editingMarker.type === "local" && (
                <div className="flex items-center gap-2 flex-wrap">
                  {USER_MARKER_LOCAL_ICON_ORDER.map((k) => {
                    const selected = selectedLocalType === k;
                    const iconPath = USER_MARKER_LOCAL_ICON_MAP[k];
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setSelectedLocalType(k)}
                        className={[
                          "w-[30px] h-[30px] rounded-full border flex items-center justify-center shrink-0",
                          selected
                            ? "bg-[radial-gradient(50%_50%_at_50%_50%,_#2E97FF_75%,_#B2D9FF_76%)] border-white"
                            : "bg-[radial-gradient(50%_50%_at_50%_50%,_#5D5D5D_75%,_#ADADAD_76%)] border-white",
                        ].join(" ")}
                      >
                        <img
                          src={getStaticUrl(iconPath)}
                          alt=""
                          className="w-[22px] h-[22px] object-contain pointer-events-none select-none"
                          draggable={false}
                        />
                      </button>
                    );
                  })}
                </div>
              )}


              {/* Type / Subtype + Coordinates */}
              <div className="flex items-center gap-2 flex-wrap text-sm">
                {/* Category */}
                <Select
                  aria-label="Category"
                  selectedKeys={selectedCategory ? new Set([selectedCategory]) : new Set()}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as string | undefined;
                    setSelectedCategory(key ?? "");
                    setSelectedSubtype("");
                  }}
                  size="sm"
                  className="w-[100px]"
                  radius="none"
                >
                  {types.map((cat) => (
                    <SelectItem
                      key={cat.id}
                      textValue={t(`types:categories.${cat.name}.name`, cat.name)}
                    >
                      {t(`types:categories.${cat.name}.name`, cat.name)}
                    </SelectItem>
                  ))}
                </Select>

                <span className="opacity-60">/</span>

                {/* Subtype */}
                <Select
                  aria-label="Subtype"
                  selectedKeys={selectedSubtype ? new Set([selectedSubtype]) : new Set()}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as string | undefined;
                    setSelectedSubtype(key ?? "");
                  }}
                  size="sm"
                  isDisabled={!selectedCategory}
                  className="w-[140px]"
                  radius="none"
                >
                  {subtypesInCategory.map((sub) => (
                    <SelectItem
                      key={sub.id}
                      textValue={t(`types:subtypes.${sub.name}.name`, sub.name)}
                    >
                      {t(`types:subtypes.${sub.name}.name`, sub.name)}
                    </SelectItem>
                  ))}
                </Select>

                {/* Coordinates */}
                <span className="opacity-80 whitespace-nowrap">
                  ({Math.round(editingMarker.x)}, {Math.round(editingMarker.y)})
                </span>
              </div>

              <Divider className="mt-2"/>

              {/* Title */}
              <Input
                label={t("common:markerActions.name", "Name")}
                labelPlacement="outside-top"
                value={name}
                onValueChange={setName}
                classNames={inputClassNames}
                radius="none"
              />

              {/* Description */}
              <Input
                label={t("common:markerActions.description", "Description")}
                labelPlacement="outside-top"
                value={description}
                onValueChange={setDescription}
                classNames={inputClassNames}
                radius="none"
              />

              <SingleImageUploader
                label={t("common:markerActions.image", "Image")}
                initialImageUrl={imageUrl}
                onFileSelected={setImageFile}
              />

              <Divider className="mt-4"/>

              {editingMarker.status && (
                <>
                  <Input
                    label={t("common:markerActions.status", "Status")}
                    labelPlacement="outside-top"
                    value={t(`common:markerActions.${editingMarker.status}`)}
                    classNames={inputClassNames}
                    radius="none"
                    disabled
                  />
                  <Input
                    label={t("common:markerActions.reply", "Reply")}
                    labelPlacement="outside-top"
                    value={editingMarker.reply}
                    classNames={inputClassNames}
                    radius="none"
                    disabled
                  />
                  <Divider className="mt-4"/>
                </>
              )}


            </ModalBody>
            <ModalFooter className="flex gap-6">
              {/* Delete (with tooltip) */}
              <div className="flex-1">
                {editingMarker?.type !== "feedback" && (
                  <Button
                    color="danger"
                    radius="sm"
                    className="w-full text-background"
                    isLoading={isDeleting}
                    isDisabled={isDeleting}
                    onPress={handleDelete}
                  >
                    {t("common:ui.delete", "Delete")}
                  </Button>
                )}
              </div>

              <div className="flex-1">
                {editingMarker?.type === "local" && (
                  <Button
                    color="default"
                    // variant="flat"
                    onPress={handleSave}
                    radius="sm"
                    className="w-full"
                  >
                    {t("common:ui.save", "Save")}
                  </Button>
                )}
              </div>

              {/* Upload */}
              <div className="flex-1">
                <Tooltip
                  content={t(
                    "common:markerActions.loginRequired",
                    "You can only upload after login"
                  )}
                  isDisabled={!!user}
                  placement="top"
                  delay={300}
                >
                  {/* Tooltip needs a wrapper when child is disabled */}
                  <span className="block w-full">
                    <Button
                      color="primary"
                      onPress={user ? handleUpload : () => setUserModalOpen(true)}
                      className="w-full text-background"
                      radius="sm"
                      isLoading={isUploading}
                      isDisabled={isUploading}
                    >
                      {!editingMarker?.status ? t("common:ui.upload", "Upload") : t("common:ui.update", "Update")}
                    </Button>
                  </span>
                </Tooltip>
              </div>
            </ModalFooter>

          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default MarkerPopupEdit;
