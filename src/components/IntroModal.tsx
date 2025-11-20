// src/components/IntroModal.tsx
import React, {useState} from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import {useTranslation} from "react-i18next";
import {getStaticUrl} from "../utils/url.ts";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faAlipay} from "@fortawesome/free-brands-svg-icons";

type IntroModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const IntroModal: React.FC<IntroModalProps> = ({isOpen, onClose}) => {
  const {t} = useTranslation("common");
  const [showImageOverlay, setShowImageOverlay] = useState<boolean>(false);
  const alipayUrl = getStaticUrl("images/alipay.webp");

  const handleCloseAll = () => {
    setShowImageOverlay(false);
    onClose();
  };

  return (
    <>
      {/* Fullscreen image overlay ABOVE the modal */}
      {showImageOverlay && (
        <div
          className="fixed inset-0 z-[31000] flex items-center justify-center bg-black/60"
          onClick={() => setShowImageOverlay(false)}
        >
          <img
            src={alipayUrl} // put your real image path here
            alt={t("introModal.helpImageAlt", "Intro image")}
            className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()} // don't close when clicking the image itself
          />
        </div>
      )}
      <Modal
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseAll();
        }}
        size="md"
        backdrop="blur"
        placement="center"
        scrollBehavior="inside"
        classNames={{
          wrapper: "z-[30000]", // overall portal wrapper
          backdrop: "z-[29999] bg-background/60 backdrop-blur-md", // make sure it's above map
          base: "z-[30001]", // actual modal panel
        }}
        hideCloseButton
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {t("introModal.title")}
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600 whitespace-pre-line">
                  {t(
                    "introModal.body",
                  )}
                </p>
                <p className="text-xs text-default-500 whitespace-pre-line mt-2">
                  {t(
                    "introModal.hint"
                  )}
                </p>
              </ModalBody>
              <ModalFooter className="flex items-center justify-between">
                <Button isIconOnly variant="light" onPress={() => setShowImageOverlay(true)}>
                  <FontAwesomeIcon icon={faAlipay} className="text-xl" />
                </Button>
                <Button color="primary" variant="solid" size="sm" onPress={onClose}>
                  {t("ui.confirm")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default IntroModal;
