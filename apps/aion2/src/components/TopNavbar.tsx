import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShellTopBar } from "@gamemap/map-shell";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@gamemap/ui";
import { useTheme, type Theme } from "@/context/ThemeContext";
import i18n, { SUPPORTED_LANGUAGES, LANGUAGE_LABELS } from "@/i18n";

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
    <ShellTopBar
      classNames={{
        root: "bg-topnavbar text-foreground",
        right: "text-[#3D3D3D] dark:text-white/85",
      }}
      leftSlot={
        <>
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
        </>
      }
      languageSwitcher={{
        languages: SUPPORTED_LANGUAGES.map((lng) => ({
          code: lng,
          label: LANGUAGE_LABELS[lng],
        })),
        current: currentLng,
        onChange: (code) => void i18n.changeLanguage(code),
        menuLabel: t("common:menu.switchLanguage", "Switch language"),
      }}
      themeSwitcher={{
        options: THEME_OPTIONS.map((value) => ({
          value,
          label: t(`common:theme.${value}`),
        })),
        current: theme,
        onChange: (value) => setTheme(value as Theme),
        menuLabel: t("common:menu.switchTheme", "Switch theme"),
      }}
      rightExtras={
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
      }
    />
  );
}
