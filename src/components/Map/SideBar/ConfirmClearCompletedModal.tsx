import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { useTranslation } from "react-i18next";

type ConfirmClearCompletedModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const ConfirmClearCompletedModal: React.FC<ConfirmClearCompletedModalProps> = ({
                                                                                 isOpen,
                                                                                 onClose,
                                                                                 onConfirm,
                                                                               }) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      classNames={{
        wrapper: "z-[20000]",
      }}
    >
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader>{t("common:menu.clearMarkerCompleted")}</ModalHeader>

            <ModalBody>
              {t("common:menu.clearMarkerCompletedBody")}
            </ModalBody>

            <ModalFooter>
              <Button variant="light" onPress={close}>
                {t("common:ui.cancel")}
              </Button>

              <Button
                color="danger"
                onPress={() => {
                  onConfirm();
                  close();
                }}
              >
                {t("common:ui.confirm")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ConfirmClearCompletedModal;
