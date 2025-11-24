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
import moment from "moment";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

  const buildTime = moment(Number(__BUILD_TIME__)).format("YYYY-MM-DD HH:mm:ss")

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
        size="3xl"
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
                <span className="text-base font-semibold">
                  {t("introModal.title")}
                </span>
                <span className="text-xs text-default-700">
                  {`${t("introModal.version", "Version")} ${__BUILD_GIT_COMMIT__.substring(0, 6)} (${buildTime})`}
                </span>
              </ModalHeader>
              <ModalBody className="space-y-3">
                {/* Markdown body */}
                <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{t("introModal.body")}</ReactMarkdown>
                </div>

                {/* Markdown hint */}
                <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{t("introModal.hint")}</ReactMarkdown>
                </div>
              </ModalBody>
              <ModalFooter className="flex items-center justify-between">
                <Button isIconOnly variant="light" onPress={() => setShowImageOverlay(true)}>
                  <FontAwesomeIcon icon={faAlipay} className="text-xl"/>
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
