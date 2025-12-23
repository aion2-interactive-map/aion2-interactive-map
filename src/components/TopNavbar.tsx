// src/components/TopNavbar.tsx
import React from "react";
import {
  Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger,
  Navbar,
  NavbarBrand,
  NavbarContent, NavbarItem, Tooltip,
} from "@heroui/react";
// import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
// import {faCloud, faDatabase} from "@fortawesome/free-solid-svg-icons";
import {useTranslation} from "react-i18next";

import {useTheme} from "@/context/ThemeContext";
import {useUser} from "@/context/UserContext";

import LanguageSwitcher from "./LanguageSwitcher";
// import {useDataMode} from "../hooks/useDataMode.tsx";
import {getStaticUrl} from "../utils/url.ts";
import ThemeDropdown from "@/components/ThemeDropdown.tsx";
import AuthModal from "@/components/AuthModal.tsx";
import {Link, useLocation} from "@tanstack/react-router";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faUser} from "@fortawesome/free-solid-svg-icons";
import ContactUs from "@/components/ContactUs.tsx";


const TopNavbar: React.FC = () => {
  const {t} = useTranslation(); // we use fully-qualified keys like common:siteTitle
  const {theme} = useTheme();
  const {user, logout, userModalOpen: authOpen, setUserModalOpen: setAuthOpen} = useUser();

  const isDark = theme === "dark";
  // const {dataMode, toggleDataMode} = useDataMode();
  // const isStatic = dataMode === "static";
  const location = useLocation();
  const currentPath = location.pathname;
  console.log(location.pathname)

  const routes = [
    {path: "/", name: "map"},
    {path: "/class", name: "class"},
    {path: "/crafting", name: "crafting"},
    {path: "/enhancement", name: "enhancement"},
    {path: "/forum", name: "forum"},
  ]

  return (
    <Navbar
      maxWidth="full"
      className="border-0 h-[60px] bg-topnavbar"
      classNames={{
        wrapper: "px-5"
      }}
    >
      {/* LEFT: Logo + Title */}
      <NavbarBrand className="flex items-center gap-10 select-none cursor-default">
        <img
          src={getStaticUrl(isDark ? "images/GroupLogoDark.webp" : "images/GroupLogoLight.webp")}
          alt="AION2 Logo"
          className="w-[100px] h-[38px] object-contain"
        />
        {routes.map((route) => {
            const isActive = currentPath === route.path
            return (
              <NavbarItem
                isActive={isActive}
                key={route.name}
                className={`
                  ${isActive ? "text-bold text-primary" : "text-default-800"}
                  text-[18px] leading-[18px]
                `}
              >
                <Link to={route.path}>
                  {t(`common:routes.${route.name}`)}
                </Link>
              </NavbarItem>
            )
          }
        )}
        <span className="text-[14px] leading-[14px] font-normal tracking-wide">
          {t("announcement", "Crafting system is ready now!")}
        </span>
      </NavbarBrand>

      {/* RIGHT: Language switcher + theme toggle */}
      <NavbarContent
        justify="end"
        className="flex items-center gap-1"
      >
        <img
          src={getStaticUrl("images/Adv.webp")}
          alt="Banner"
          className="h-10 w-auto object-contain select-none pointer-events-none"
        />


        {/* Language switcher (owns its own button & dropdown) */}
        <LanguageSwitcher/>

        <ThemeDropdown/>

        <ContactUs />

        {!user ? (
          <>
            <Tooltip
              content={t("common:auth.login", "Login") + " / " + t("common:auth.register", "Register")}
              placement="bottom"
              delay={300}
            >
              <Button
                isIconOnly variant="light"
                onPress={() => setAuthOpen(true)}
              >
                <FontAwesomeIcon icon={faUser} className="text-lg"/>
              </Button>
            </Tooltip>
            <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)}/>
          </>
        ) : (
          <>
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button
                  variant="light"
                  className="px-2 text-sm font-normal"
                >
                  {user.name ?? user.email}
                </Button>
              </DropdownTrigger>

              <DropdownMenu aria-label="User menu">
                <DropdownItem
                  key="logout"
                  color="danger"
                  onPress={logout}
                >
                  {t("common:auth.logout", "Logout")}
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>

            {/* Keep modal mounted so you can open it from other places if needed */}
            {/*<AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />*/}
          </>
        )}

        {/*<Button isIconOnly variant="light" onPress={onOpenIntroModal}>
          <FontAwesomeIcon icon={faCircleInfo} className="text-lg" />
        </Button>*/}

      </NavbarContent>
    </Navbar>
  );
};

export default TopNavbar;
