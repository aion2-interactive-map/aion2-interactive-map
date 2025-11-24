// src/components/TopNavbar.tsx
import React from "react";
import {
  Button,
  Navbar,
  NavbarBrand,
  NavbarContent,
} from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {faMoon, faSun, faCloud, faDatabase, faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";

import {useTheme} from "@/context/ThemeContext";
import LanguageSwitcher from "./LanguageSwitcher";
import {useDataMode} from "../hooks/useDataMode.tsx";
import {getStaticUrl} from "../utils/url.ts";

type TopNavbarProps = {
  onOpenIntroModal?: () => void;
};

const TopNavbar: React.FC<TopNavbarProps> = ({ onOpenIntroModal }) => {
  const { t } = useTranslation(); // we use fully-qualified keys like common:siteTitle
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const { dataMode, toggleDataMode } = useDataMode();
  const isStatic = dataMode === "static";

  return (
    <Navbar
      maxWidth="full"
      className="border-b border-default-200 px-4 h-[60px] bg-topnavbar"
    >
      {/* LEFT: Logo + Title */}
      <NavbarBrand className="flex items-center gap-2 select-none cursor-default">
        <img
          src={`${import.meta.env.BASE_URL}aion2.webp`}
          alt="AION2 Logo"
          className="w-8 h-8 object-contain"
        />
        <span className="font-semibold text-lg tracking-wide">
          {t("common:siteTitle", "AION2 Interactive Map")}
        </span>
      </NavbarBrand>

      <div
        className="
          absolute left-1/2 top-1/2
          -translate-x-1/2 -translate-y-1/2
          pointer-events-none
          text-sm font-medium
        "
      >
        {t("announcement", "Welcome to AION2 Interactive Map!")}
      </div>

      {/* RIGHT: Language switcher + theme toggle */}
      <NavbarContent
        justify="end"
        className="flex items-center gap-1"
      >
        <a href="https://m.flashkrypton.com/?ch=10004&gameConfigId=286&autoShow=0#/community" target="_blank">
          <img
            src={getStaticUrl("images/shanke.webp")}
            alt="Banner"
            className="h-10 w-auto object-contain select-none pointer-events-none"
          />
        </a>

        {/* Language switcher (owns its own button & dropdown) */}
        <LanguageSwitcher />

        {/* Theme toggle */}
        <Button isIconOnly variant="light" onPress={toggleTheme}>
          <FontAwesomeIcon
            icon={isDark ? faSun : faMoon}
            className="text-lg"
          />
        </Button>

        {/* Data mode toggle */}
        <Button isIconOnly variant="light" onPress={toggleDataMode}>
          <FontAwesomeIcon
            icon={isStatic ? faDatabase : faCloud}
            className="text-lg"
          />
        </Button>


        <Button isIconOnly variant="light" onPress={onOpenIntroModal}>
          <FontAwesomeIcon icon={faCircleInfo} className="text-lg" />
        </Button>

      </NavbarContent>
    </Navbar>
  );
};

export default TopNavbar;
