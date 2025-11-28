// src/components/TopNavbar.tsx
import React from "react";
import {
  Button,
  Navbar,
  NavbarBrand,
  NavbarContent,
} from "@heroui/react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCloud, faDatabase} from "@fortawesome/free-solid-svg-icons";
import {useTranslation} from "react-i18next";

import {useTheme} from "@/context/ThemeContext";
import LanguageSwitcher from "./LanguageSwitcher";
import {useDataMode} from "../hooks/useDataMode.tsx";
import {getStaticUrl} from "../utils/url.ts";
import ThemeDropdown from "@/components/ThemeDropdown.tsx";


const TopNavbar: React.FC = () => {
  const {t} = useTranslation(); // we use fully-qualified keys like common:siteTitle
  const {theme} = useTheme();
  const isDark = theme === "dark";
  const {dataMode, toggleDataMode} = useDataMode();
  const isStatic = dataMode === "static";

  return (
    <Navbar
      maxWidth="full"
      className="border-0 h-[60px] bg-topnavbar"
      classNames={{
        wrapper: "px-5"
      }}
    >
      {/* LEFT: Logo + Title */}
      <NavbarBrand className="flex items-center gap-4 select-none cursor-default">
        <img
          src={getStaticUrl(isDark ? "images/GroupLogoDark.webp" : "images/GroupLogoLight.webp")}
          alt="AION2 Logo"
          className="w-[100px] h-[38px] object-contain"
        />
        <span className="text-[14px] leading-[14px] font-normal tracking-wide">
          {t("announcement", "Welcome to AION2 Interactive Map!")}
        </span>
      </NavbarBrand>

      {/* RIGHT: Language switcher + theme toggle */}
      <NavbarContent
        justify="end"
        className="flex items-center gap-1"
      >
        {import.meta.env.VITE_REGION === "CHINA" && (

          <a href="https://m.flashkrypton.com/?ch=10004&gameConfigId=286&autoShow=0#/community" target="_blank"
             datatype="advertisement">
            <img
              src={getStaticUrl("images/shanke.webp")}
              alt="Banner"
              className="h-10 w-auto object-contain select-none pointer-events-none"
            />
          </a>
        )}

        {/* Language switcher (owns its own button & dropdown) */}
        <LanguageSwitcher/>

        <ThemeDropdown />

        {/* Data mode toggle */}
        <Button isIconOnly variant="light" onPress={toggleDataMode}>
          <FontAwesomeIcon
            icon={isStatic ? faDatabase : faCloud}
            className="text-lg"
          />
        </Button>

        {/*<Button isIconOnly variant="light" onPress={onOpenIntroModal}>
          <FontAwesomeIcon icon={faCircleInfo} className="text-lg" />
        </Button>*/}

      </NavbarContent>
    </Navbar>
  );
};

export default TopNavbar;
