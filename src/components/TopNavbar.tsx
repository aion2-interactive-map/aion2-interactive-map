import { CheckIcon, Languages, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type Theme } from "@/context/ThemeContext";
import i18n, { SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n";

const THEME_OPTIONS: Theme[] = ["auto", "light", "dark", "abyss"];

type NavTab = {
  key: string;
  /** i18n label key under `nav.` */
  labelKey: string;
  /** route path; only `/` is built today */
  to?: "/";
};

const NAV_TABS: NavTab[] = [
  { key: "home", labelKey: "nav.home", to: "/" },
  { key: "classBd", labelKey: "nav.classBd" },
  { key: "crafting", labelKey: "nav.crafting" },
  { key: "enhancement", labelKey: "nav.enhancement" },
  { key: "forum", labelKey: "nav.forum" },
];

export default function TopNavbar() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const currentLng = i18n.resolvedLanguage ?? i18n.language;

  return (
    <header className="flex h-12 shrink-0 items-center gap-6 bg-topnavbar px-4 text-foreground">
      {/* Left: wordmark */}
      <Link
        to="/"
        className="text-lg font-bold tracking-tight text-[#2E97FF] select-none"
      >
        AION2
      </Link>

      {/* Nav tabs */}
      <nav className="flex items-center gap-6 text-sm">
        {NAV_TABS.map((tab) => {
          const label = t(`common:${tab.labelKey}`);
          // Only the Home tab routes; it is the active tab on the map page.
          if (tab.to) {
            return (
              <Link
                key={tab.key}
                to={tab.to}
                activeOptions={{ exact: true }}
                className="font-bold text-[#2E97FF]"
              >
                {label}
              </Link>
            );
          }
          return (
            <span
              key={tab.key}
              aria-disabled="true"
              className="cursor-default text-black/40 select-none"
            >
              {label}
            </span>
          );
        })}
      </nav>

      {/* Right cluster: language + theme icon buttons */}
      <div className="ml-auto flex items-center gap-1 text-[#3D3D3D]">
        {/* Language menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid="lang-menu"
              aria-label={t("common:menu.switchLanguage", "Switch language")}
              title={t("common:menu.switchLanguage", "Switch language")}
            >
              <Languages className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[2000]">
            {SUPPORTED_LANGUAGES.map((lng: LanguageCode) => (
              <DropdownMenuItem
                key={lng}
                data-testid={`lang-${lng}`}
                onSelect={() => void i18n.changeLanguage(lng)}
              >
                <span className="flex-1">{t(`common:language.${lng}`)}</span>
                {currentLng === lng && <CheckIcon className="size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid="theme-menu"
              aria-label={t("common:menu.switchTheme", "Switch theme")}
              title={t("common:menu.switchTheme", "Switch theme")}
            >
              <Settings className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[2000]">
            {THEME_OPTIONS.map((value) => (
              <DropdownMenuItem
                key={value}
                data-testid={`theme-${value}`}
                onSelect={() => setTheme(value)}
              >
                <span className="flex-1">{t(`common:theme.${value}`)}</span>
                {theme === value && <CheckIcon className="size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
