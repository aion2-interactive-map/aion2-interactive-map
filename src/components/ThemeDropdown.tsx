import {Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button} from "@heroui/react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faMoon, faSun, faCircleHalfStroke, type IconDefinition, faFire} from "@fortawesome/free-solid-svg-icons";
import {useTranslation} from "react-i18next";
import {type Theme, useTheme} from "@/context/ThemeContext";

// 🔥 Theme → Icon map
const THEME_ICON_MAP: Record<Theme, IconDefinition> = {
  auto: faCircleHalfStroke,
  light: faSun,
  dark: faMoon,
  abyss: faFire
} as const;

const ThemeDropdown: React.FC = () => {
  const {t} = useTranslation();
  const {theme, setTheme} = useTheme();

  // Current icon based on active theme
  const activeIcon = THEME_ICON_MAP[theme];

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button isIconOnly variant="light">
          <FontAwesomeIcon icon={activeIcon} className="text-lg"/>
        </Button>
      </DropdownTrigger>

      <DropdownMenu aria-label="Theme selection" variant="flat" className="min-w-[150px]">
        {Object.entries(THEME_ICON_MAP).map(([key, icon]) => (
          <DropdownItem key={key} onPress={() => setTheme(key as Theme)}>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={icon}/>
              {t(`common:theme.${key}`)} {/* translatable */}
            </div>
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

export default ThemeDropdown;
