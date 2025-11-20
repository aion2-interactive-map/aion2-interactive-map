// src/components/TopNavbar.tsx
import React from "react";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
} from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun, faCloud, faDatabase } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../hooks/useTheme";
import LanguageSwitcher from "./LanguageSwitcher";
import {useDataMode} from "../hooks/useDataMode.tsx";

const TopNavbar: React.FC = () => {
  const { t } = useTranslation(); // we use fully-qualified keys like common:siteTitle
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const { dataMode, toggleDataMode } = useDataMode();
  const isStatic = dataMode === "static";

  return (
    <Navbar
      maxWidth="full"
      className="border-b border-default-200 px-4"
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

      {/* RIGHT: Language switcher + theme toggle */}
      <NavbarContent
        justify="end"
        className="flex items-center gap-4"
      >
        {/* Language switcher (owns its own button & dropdown) */}
        <LanguageSwitcher />

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="text-default-600 hover:text-default-900 transition-colors"
        >
          <FontAwesomeIcon
            icon={isDark ? faSun : faMoon}
            className="text-lg"
          />
        </button>

        {/* Data mode toggle */}
        <button
          type="button"
          onClick={toggleDataMode}
          aria-label="Toggle theme"
          className="text-default-600 hover:text-default-900 transition-colors"
          style={{display: "none"}}
        >
          <FontAwesomeIcon
            icon={isStatic ? faDatabase : faCloud}
            className="text-lg"
          />
        </button>
      </NavbarContent>
    </Navbar>
  );
};

export default TopNavbar;
