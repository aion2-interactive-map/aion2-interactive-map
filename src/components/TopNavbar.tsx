// src/components/TopNavbar.tsx
import React from "react";
import {
  Navbar,
  NavbarBrand,
  NavbarContent, NavbarItem,
  NavbarMenu, NavbarMenuItem, NavbarMenuToggle,
} from "@heroui/react";
// import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
// import {faCloud, faDatabase} from "@fortawesome/free-solid-svg-icons";
import {useTranslation} from "react-i18next";
// import Marquee from "react-fast-marquee";

import {useTheme} from "@/context/ThemeContext";

import LanguageSwitcher from "./LanguageSwitcher";
// import {useDataMode} from "../hooks/useDataMode.tsx";
import {getStaticUrl} from "../utils/url.ts";
import ThemeDropdown from "@/components/ThemeDropdown.tsx";
import UserDropdown from "@/components/UserDropdown.tsx";
import {Link, useLocation} from "@tanstack/react-router";
import ContactUs from "@/components/ContactUs.tsx";
import Donate from "@/components/Donate.tsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// import Ticker from "react-ticker";


const TopNavbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const {t} = useTranslation(); // we use fully-qualified keys like common:siteTitle
  const {theme} = useTheme();

  const isDark = theme === "dark";
  // const {dataMode, toggleDataMode} = useDataMode();
  // const isStatic = dataMode === "static";
  const location = useLocation();
  const currentPath = location.pathname;
  console.log(location.pathname)

  const routes = [
    {path: "/", name: "map"},
    {path: "/crafting", name: "crafting"},
    // {path: "/enhancement", name: "enhancement"},
    {path: "/character", name: "character"},
    {path: "/leaderboard", name: "leaderboard"},
    // {path: "/class", name: "class"},
    {path: "/forum", name: "forum"},
  ]

  return (
    <Navbar
      onMenuOpenChange={setIsMenuOpen}
      isMenuOpen={isMenuOpen}
      maxWidth="full"
      className="border-0 h-[60px] bg-topnavbar"
      classNames={{ wrapper: "px-5" }}
    >
      {/* LEFT: Toggle + Logo + Title */}
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="sm:hidden"
        />
        <NavbarBrand className="flex items-center gap-10 select-none cursor-default">
          <img
            src={getStaticUrl(isDark ? "images/GroupLogoDark.webp" : "images/GroupLogoLight.webp")}
            alt="AION2 Logo"
            className="w-[100px] h-[38px] object-contain"
          />
          {routes.map((route) => {
            const isActive = currentPath === route.path || (route.path !== "/" && currentPath.startsWith(route.path));
            return (
              <NavbarItem
                isActive={isActive}
                key={route.name}
                className={`hidden sm:flex ${
                  isActive ? "text-bold text-primary" : "text-default-800"
                } text-[18px] leading-[18px]`}
              >
                <Link to={route.path}>{t(`common:routes.${route.name}`)}</Link>
              </NavbarItem>
            );
          })}
          <div className="hidden sm:block text-sm leading-[14px] prose prose-xs max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {t("introModal.alert")}
            </ReactMarkdown>
          </div>
        </NavbarBrand>
      </NavbarContent>

      {/* RIGHT: Language switcher + theme toggle */}
      <NavbarContent justify="end" className="flex items-center gap-1">
        <img
          src={getStaticUrl("images/Adv.webp")}
          alt="Banner"
          className="hidden md:block w-[300px] object-contain select-none pointer-events-none"
        />

        {/* Language switcher (owns its own button & dropdown) */}
        <LanguageSwitcher />
        <ThemeDropdown />
        <ContactUs />
        <Donate />
        <UserDropdown />
      </NavbarContent>

      <NavbarMenu>
        {routes.map((route) => {
          const isActive = currentPath === route.path;
          return (
            <NavbarMenuItem key={route.name}>
              <Link
                className={`w-full text-[18px] ${
                  isActive ? "text-bold text-primary" : "text-default-800"
                }`}
                to={route.path}
                onClick={() => setIsMenuOpen(false)}
              >
                {t(`common:routes.${route.name}`)}
              </Link>
            </NavbarMenuItem>
          );
        })}
      </NavbarMenu>
    </Navbar>

  );
};

export default TopNavbar;
