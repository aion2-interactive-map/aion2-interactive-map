import React, {useState} from "react";
import SidebarWrapper from "./SidebarWrapper";
import {Accordion, AccordionItem, Button} from "@heroui/react";
import {makeAccordionTitle} from "@/components/SideBar/makeAccordionTitle.tsx";
import {useTranslation} from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {getStaticUrl} from "@/utils/url.ts";
import BottomSidebarBanner from "@/components/SideBar/BottomSidebarBanner.tsx";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faAlipay} from "@fortawesome/free-brands-svg-icons";
import {useSiteConfig} from "@/context/SiteConfigContext.tsx";

const RightSidebar: React.FC = () => {
  const {t} = useTranslation("common");
  const [showImageOverlay, setShowImageOverlay] = useState<boolean>(false);
  const alipayUrl = getStaticUrl("images/alipay.webp");
  const {getConfigValue, setConfigValue} = useSiteConfig();

  const onToggleCollapsed = (collapsed: boolean) => {
    setConfigValue("rightSidebar.collapsed", collapsed);
  }
  const collapsed = getConfigValue<boolean>("rightSidebar.collapsed");

  return (
    <SidebarWrapper side="right" width={344} collapsed={collapsed} onToggleCollapsed={onToggleCollapsed}>
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
      <Accordion
        variant="shadow"
        selectionMode="multiple"
        defaultExpandedKeys={["members", "contact", "donation"]}
        itemClasses={{
          base: "!bg-transparent !shadow-none !backdrop-filter-none !backdrop-blur-none",
          trigger: "py-4 min-h-0 px-2",
          title: "text-[16px] leading-[16px] font-bold",
          content: "py-0",
        }}
        className="bg-transparent shadow-none"
        showDivider={false}
      >
        <AccordionItem key="members" title={makeAccordionTitle(t("rightSidebar.members.title"))}>
          <div className="text-sm prose prose-sm dark:prose-invert abyss:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{t("rightSidebar.members.content")}</ReactMarkdown>
          </div>
        </AccordionItem>
        <AccordionItem key="contact" title={makeAccordionTitle(t("rightSidebar.contact.title"))}>
          <div className="text-sm prose prose-sm dark:prose-invert abyss:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{t("rightSidebar.contact.content")}</ReactMarkdown>
          </div>
        </AccordionItem>
        <AccordionItem key="donation" title={makeAccordionTitle(t("rightSidebar.donation.title"))}>
          <div className="text-sm prose prose-sm dark:prose-invert abyss:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{t("rightSidebar.donation.content")}</ReactMarkdown>
            <Button className="-mt-4" isIconOnly variant="light" onPress={() => setShowImageOverlay(true)}>
              <FontAwesomeIcon icon={faAlipay} className="text-xl"/>
            </Button>
          </div>
        </AccordionItem>
      </Accordion>
      {import.meta.env.VITE_REGION === "CHINA" && (
        <>
          <BottomSidebarBanner
            href="https://186.yousheng186.com/?promotionCode=HDDT"
            href2="https://qm.qq.com/q/YGRfrMFvqw"
            imageUrl={getStaticUrl("images/YouSheng.webp")}
            imageUrl2={getStaticUrl("images/PangXieRight.webp")}
            height={350}
            closeButtonPosition="top-right"
          />
        </>
      )}
    </SidebarWrapper>
  );
};

export default RightSidebar;
