// src/components/IntroModal.tsx
import React from "react";
import {
  Button, Popover, PopoverTrigger, PopoverContent, Tooltip, AccordionItem, Accordion
} from "@heroui/react";
import {useTranslation} from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faDollar} from "@fortawesome/free-solid-svg-icons";
import {getStaticUrl} from "@/utils/url.ts";
import {makeAccordionTitle} from "@/components/Map/SideBar/makeAccordionTitle.tsx";


const Donate: React.FC = () => {
  const {t} = useTranslation("common");
  const alipayUrl = getStaticUrl("images/alipay.webp");


  return (
    <Popover placement="bottom" radius="sm" classNames={{
      base: "pt-1",
      content: "bg-sidebar"
    }}>
      <Tooltip
        content={t("common:menu.donate", "Donate")}
        placement="bottom"
        delay={150}
      >
        <div>
          <PopoverTrigger>
            <Button isIconOnly variant="light">
              <FontAwesomeIcon icon={faDollar} className="text-lg"/>
            </Button>
          </PopoverTrigger>
        </div>
      </Tooltip>

      <PopoverContent className="w-[256px]">
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
          <AccordionItem key="donation" title={makeAccordionTitle(t("rightSidebar.donation.title"))}>
            <div className="text-sm prose prose-sm dark:prose-invert abyss:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{t("rightSidebar.donation.content")}</ReactMarkdown>
            </div>
            <img
              src={alipayUrl} // put your real image path here
              alt={t("introModal.helpImageAlt", "Intro image")}
              className="w-full rounded-lg shadow-xl mt-3"
            />
          </AccordionItem>
        </Accordion>
      </PopoverContent>
    </Popover>
  );
};

export default Donate;
