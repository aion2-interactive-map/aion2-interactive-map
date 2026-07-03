import { CheckIcon, Languages, Mail, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@gamemap/ui";
import { useTheme, type Theme } from "@/context/ThemeContext";
import i18n, { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, type LanguageCode } from "@/i18n";

// "abyss" is disabled for now — kept in the Theme type + CSS for easy re-enable,
// but not offered in the switcher.
const THEME_OPTIONS: Theme[] = ["auto", "light", "dark"];

// Old-version archive entry, shown while the new version is being rebuilt
// (the nav tabs 首页/职业BD/… are hidden until those pages are ported).
const ARCHIVE_URL = "https://archive.tc-imba.com/";

export default function TopNavbar() {
  const { t } = useTranslation(["common", "wiki"]);
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
      <Link
        to="/wiki"
        className="text-sm text-foreground/80 hover:text-foreground"
      >
        {t("wiki:nav.wiki")}
      </Link>

      {/* Rebuild notice (nav tabs hidden during the rewrite) */}
      <div className="text-sm text-[#3D3D3D] dark:text-white/80">
        已更新第四赛季新地图，全新版本重制中，旧版入口：
        <a
          href={ARCHIVE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#2E97FF] hover:underline"
        >
          {ARCHIVE_URL}
        </a>
      </div>

      {/* Right cluster: language + theme icon buttons */}
      <div className="ml-auto flex items-center gap-1 text-[#3D3D3D] dark:text-white/85">
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
                <span className="flex-1">{LANGUAGE_LABELS[lng]}</span>
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

        {/* Contact / about */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid="contact-menu"
              aria-label={t("common:menu.contact", "Contact us")}
              title={t("common:menu.contact", "Contact us")}
            >
              <Mail className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="max-h-[70vh] w-[300px] overflow-y-auto"
          >
            <div className="mb-2 text-base font-semibold">
              {t("common:rightSidebar.contact.title", "Communication & Contact")}
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none break-words text-sm [&_a]:text-primary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {t("common:rightSidebar.contact.content")}
              </ReactMarkdown>
            </div>
          </PopoverContent>
        </Popover>

      </div>
    </header>
  );
}
