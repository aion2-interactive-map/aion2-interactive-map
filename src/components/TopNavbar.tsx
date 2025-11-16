// src/components/TopNavbar.tsx
import React from "react";
import { Navbar, NavbarBrand, NavbarContent } from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe, faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";

import LanguageSwitcher from "./LanguageSwitcher";
import { useTheme } from "../hooks/useTheme";

const TopNavbar: React.FC = () => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <Navbar maxWidth="full" className="border-b border-default-200">

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

      {/* RIGHT: Language switcher + theme switch */}
      <NavbarContent justify="end" className="flex items-center gap-4">

        {/* Language Switcher Icon */}
        <LanguageSwitcher>
          <button
            className="text-default-600 hover:text-default-900 transition-colors"
            aria-label="Change Language"
          >
            <FontAwesomeIcon icon={faGlobe} className="text-lg" />
          </button>
        </LanguageSwitcher>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="text-default-600 hover:text-default-900 transition-colors"
        >
          <FontAwesomeIcon
            icon={isDark ? faSun : faMoon}
            className="text-lg"
          />
        </button>

      </NavbarContent>
    </Navbar>
  );
};

export default TopNavbar;
