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

const MarkerPopupEdit: React.FC = () => {
  const {
    editingMarker,
    setEditingMarker,
    updateMarker,
    deleteMarker,
  } = useUserMarkers();

  const { types } = useGameMap();
  const { t } = useTranslation();

  const [tab, setTab] = useState<"local" | "feedback">("local");
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
    setTab(editingMarker.type ?? "local");

    // find category that contains marker's subtype
    const currentSubtype = editingMarker.subtype ?? "";
    let foundCategory = "";
    for (const cat of types) {
      if (cat.subtypes.some((s) => s.name === currentSubtype)) {
        foundCategory = cat.name;
        break;
      }
    }

    setSelectedCategory(foundCategory);
    setSelectedSubtype(currentSubtype);
  }, [editingMarker, types]);

  if (!editingMarker) return null;

  const subtypesInCategory =
    types.find((cat) => cat.name === selectedCategory)?.subtypes ?? [];

  const inputClassNames = {
    inputWrapper: ` bg-input-2 hover:!bg-input-2 focus:!bg-input-2 transition-none
                    group-data-[hover=true]:!bg-input-2
                    group-data-[focus=true]:!bg-input-2
                    group-data-[focus-visible=true]:!bg-input-2
                    group-data-[invalid=true]:!bg-input-2
                  `,
    innerWrapper: `h-10 py-0`
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
                      key={cat.name}
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
                      key={sub.name}
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
            <ModalFooter className="flex justify-between">
              <Button
                color="danger"
                variant="light"
                onPress={() => deleteMarker(editingMarker.id)}
              >
                {t("common:ui.delete", "Delete")}
              </Button>

              <Button
                color="primary"
                onPress={() => {
                  const finalSubtype =
                    selectedSubtype || editingMarker.subtype || "";

                  updateMarker({
                    ...editingMarker,
                    name,
                    description,
                    subtype: finalSubtype,
                    type: tab,
                  });
                  setEditingMarker(null);
                }}
                className="text-background"
              >
                {t("common:ui.save", "Save")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default MarkerPopupEdit;
