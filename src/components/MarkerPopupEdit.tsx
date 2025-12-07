// src/components/MarkerPopupEdit.tsx
import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Button,
  Select,
  SelectItem, Divider,
} from "@heroui/react";
import { useUserMarkers } from "@/context/UserMarkersContext";
import { useTranslation } from "react-i18next";
import {useGameMap} from "@/context/GameMapContext.tsx";
import {useUser} from "@/context/UserContext.tsx";
import type {UserMarkerInstance} from "@/types/game.ts";


const MarkerPopupEdit: React.FC = () => {
  const {
    editingMarker,
    setEditingMarker,
    createMarkerRemote,
    updateMarker,
    deleteMarker,
  } = useUserMarkers();

  const { types, selectedMap } = useGameMap();
  const {fetchWithAuth} = useUser();
  const { t } = useTranslation();

  // const [tab, setTab] = useState<"local" | "feedback">("local");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // two-level select state
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubtype, setSelectedSubtype] = useState<string>("");

  // when marker or types change, sync local state
  useEffect(() => {
    if (!editingMarker) return;

    setName(editingMarker.name ?? "");
    setDescription(editingMarker.description ?? "");
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
  }, [editingMarker, types]);

  if (!editingMarker) return null;

  const subtypesInCategory =
    types.find((cat) => cat.id === selectedCategory)?.subtypes ?? [];

  const inputClassNames = {
    inputWrapper: ` bg-input-2 hover:!bg-input-2 focus:!bg-input-2 transition-none
                    group-data-[hover=true]:!bg-input-2
                    group-data-[focus=true]:!bg-input-2
                    group-data-[focus-visible=true]:!bg-input-2
                    group-data-[invalid=true]:!bg-input-2
                  `,
    innerWrapper: `h-10 py-0`
  }

  const handleUpload = async () => {
    const finalSubtype = selectedSubtype || editingMarker.subtype || "";
    console.log(finalSubtype)

    if (editingMarker.type === "uploaded") {
      const res = await fetchWithAuth(`/maps/${selectedMap?.name}/marker_feedbacks/${editingMarker.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // x: Math.round(editingMarker.x),
          // y: Math.round(editingMarker.y),
          subtype: finalSubtype,
          name: name,
          description: description,
        })
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.errorCode !== "Success") return;

      const markerData = data.data;
      updateMarker({
        ...editingMarker,
        name: markerData.name,
        description: markerData.description,
        subtype: markerData.subtypeId,
        type: "uploaded",
      });
      setEditingMarker(null);

    } else {
      // create marker feedback
      const res = await fetchWithAuth(`/maps/${selectedMap?.name}/marker_feedbacks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          x: Math.round(editingMarker.x),
          y: Math.round(editingMarker.y),
          subtype: finalSubtype,
          name: name,
          description: description,
        })
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.errorCode !== "Success") return;

      // remove local marker and add the remote one
      deleteMarker(editingMarker.id);
      const markerData = data.data;

      const marker: UserMarkerInstance = {
        id: markerData.id,
        subtype: markerData.subtypeId,
        mapId: markerData.mapId,
        x: markerData.x,
        y: markerData.y,
        name: markerData.name,
        description: markerData.description,
        type: "uploaded",
      };
      createMarkerRemote(marker);
      // setEditingMarker(null);
    }
    // setEditingMarker(null);
  }

  return (
    <Modal
      isOpen
      onOpenChange={() => setEditingMarker(null)}
      placement="center"
      size="md"
      classNames={{ wrapper: "z-[30000]" }}
    >
      <ModalContent className="bg-sidebar">
        {() => (
          <>
            <ModalHeader>
              {t("common:markerActions.editUserMarker", "Edit User Marker")}
            </ModalHeader>

            <ModalBody className="flex flex-col gap-3">
              {/* Tabs */}
              {/*<Tabs*/}
              {/*  selectedKey={tab}*/}
              {/*  onSelectionChange={(k) => setTab(k as "local" | "feedback")}*/}
              {/*  size="sm"*/}
              {/*  radius="sm"*/}
              {/*  fullWidth*/}
              {/*  variant="light"*/}
              {/*  classNames={{*/}
              {/*    tab: `*/}
              {/*      text-default-700 data-[selected=true]:text-foreground*/}
              {/*    `,*/}
              {/*  }}*/}
              {/*>*/}
              {/*  <Tab key="local" title={t("common:markerActions.local", "Local")} />*/}
              {/*  <Tab key="feedback" title={t("common:markerActions.feedback", "Feedback")} />*/}
              {/*</Tabs>*/}

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
              <Divider className="mt-4"/>

            </ModalBody>
            <ModalFooter className="flex gap-6">
              <Button
                color="default"
                variant="flat"
                onPress={() => setEditingMarker(null)}
                radius="sm"
                className="flex-1"
              >
                {t("common:ui.cancel", "Cancel")}
              </Button>
              <Button
                color="primary"
                onPress={handleUpload}
                className="flex-1 text-background"
                radius="sm"
              >
                {t("common:ui.upload", "Upload")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default MarkerPopupEdit;
