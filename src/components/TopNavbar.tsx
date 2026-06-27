import { CheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

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

export default function TopNavbar() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const currentLng = i18n.resolvedLanguage ?? i18n.language;

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-3 text-card-foreground">
      <span className="font-semibold tracking-tight select-none">
        {t("common:appName", "AION2 Map")}
      </span>

      <div className="ml-auto flex items-center gap-2">
        {/* Theme menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              data-testid="theme-menu"
            >
              {t("common:menu.switchTheme", "Switch theme")}
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

        {/* Language menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              data-testid="lang-menu"
            >
              {t("common:menu.switchLanguage", "Switch language")}
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
      </div>
    </header>
  );
}
