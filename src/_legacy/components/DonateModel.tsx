// src/components/IntroModal.tsx
import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import {useTranslation} from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {getStaticUrl} from "@/utils/url.ts";

type IntroModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const DonateModal: React.FC<IntroModalProps> = ({isOpen, onClose}) => {
  const {t} = useTranslation("common");
  const alipayUrl = getStaticUrl("images/alipay.webp");
  //
  const handleCloseAll = () => {
    // setShowImageOverlay(false);
    onClose();
  };


  return (
    <>
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
              </ModalHeader>
              <ModalBody className="space-y-3">
                {/* Markdown body */}
                <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {t("donateModal.body")}
                  </ReactMarkdown>
                </div>

                {/* Centered image */}
                <div className="flex justify-center">
                  <img
                    src={alipayUrl}
                    alt={t("introModal.helpImageAlt", "Intro image")}
                    className="
                                w-[260px]
                                max-w-full
                                rounded-lg
                                shadow-xl
                              "
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </ModalBody>

              <ModalFooter className="flex items-center justify-right">
                {/*<Button isIconOnly variant="light" onPress={() => setShowImageOverlay(true)}>*/}
                {/*  <FontAwesomeIcon icon={faAlipay} className="text-xl"/>*/}
                {/*</Button>*/}
                <Button color="default" variant="solid" size="sm" onPress={onClose}>
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

export default DonateModal;
