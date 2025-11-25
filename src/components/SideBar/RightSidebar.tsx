import React from "react";
import SidebarWrapper from "./SidebarWrapper";
import {Accordion, AccordionItem} from "@heroui/react";
import {makeAccordionTitle} from "@/components/SideBar/makeAccordionTitle.tsx";
import {useTranslation} from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const RightSidebar: React.FC = () => {
  const { t } = useTranslation("common");
  return (
    <SidebarWrapper side="right" width={344}>
      <Accordion
        variant="shadow"
        selectionMode="multiple"
        defaultExpandedKeys={["members", "contact"]}
        itemClasses={{
          base: "!bg-transparent !shadow-none !backdrop-filter-none !backdrop-blur-none",
          trigger: "py-4 min-h-0 px-2",
          title: "text-[16px] leading-[16px] font-bold",
          content: "py-0",
        }}
        className="bg-transparent shadow-none"
      >
        <AccordionItem key="members" title={makeAccordionTitle(t("rightSidebar.members.title"))}>
          <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{t("rightSidebar.members.content")}</ReactMarkdown>
          </div>
        </AccordionItem>
        <AccordionItem key="contact" title={makeAccordionTitle(t("rightSidebar.contact.title"))}>
          <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{t("rightSidebar.contact.content")}</ReactMarkdown>
          </div>
        </AccordionItem>
      </Accordion>
    </SidebarWrapper>
  );
};

export default RightSidebar;
