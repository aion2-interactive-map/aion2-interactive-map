// src/components/IntroModal.tsx
import React from "react";
import {
  Button, Popover, PopoverTrigger, PopoverContent, Tooltip, AccordionItem, Accordion,
} from "@heroui/react";
import {useTranslation} from "react-i18next";
import moment from "moment";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faEnvelope} from "@fortawesome/free-solid-svg-icons";
import {makeAccordionTitle} from "@/components/Map/SideBar/makeAccordionTitle.tsx";


const ContactUs: React.FC = () => {
  const {t} = useTranslation("common");

  const buildTime = moment(Number(__BUILD_TIME__)).format("YYYY-MM-DD HH:mm:ss")


  return (
    <Popover placement="bottom" radius="sm" classNames={{
      base: "pt-1",
      content: "bg-sidebar"
    }}>
      <Tooltip
        content={t("common:menu.contact", "Contact us")}
        placement="bottom"
        delay={150}
      >
        <div>
          <PopoverTrigger>
            <Button isIconOnly variant="light">
              <FontAwesomeIcon icon={faEnvelope} className="text-lg"/>
            </Button>
          </PopoverTrigger>
        </div>
      </Tooltip>


      <PopoverContent className="w-[256px] p-1">
        <div className="flex flex-col gap-1 pt-2">
                <span className="text-base font-semibold">
                  {t("introModal.title")}
                </span>
          <span className="text-xs text-default-700">
                  {`${t("introModal.version", "Version")} ${__BUILD_GIT_COMMIT__.substring(0, 6)} (${buildTime})`}
                </span>
        </div>
        <Accordion
          variant="light"
          selectionMode="multiple"
          defaultExpandedKeys={["members", "contact", "donation"]}
          itemClasses={{
            base: "!bg-transparent !shadow-none !backdrop-filter-none !backdrop-blur-none pb-2 ",
            trigger: "py-4 min-h-0 px-2",
            title: "text-base leading-[16px] font-bold",
            content: "py-0",
            indicator: "text-default-700",
          }}
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
        </Accordion>
      </PopoverContent>
    </Popover>
  );
};

export default ContactUs;
