import React from "react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
  Tooltip
} from "@heroui/react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faUser, faRightToBracket} from "@fortawesome/free-solid-svg-icons";
import {useTranslation} from "react-i18next";
import {useUser} from "@/context/UserContext";
import AuthModal from "@/components/AuthModal.tsx";

interface UserDropdownProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({isOpen, onOpenChange}) => {
  const {t} = useTranslation();
  const {user, logout, userModalOpen: authOpen, setUserModalOpen: setAuthOpen} = useUser();

  if (!user) {
    return (
      <>
        <Tooltip
          content={t("common:auth.login", "Login") + " / " + t("common:auth.register", "Register")}
          placement="bottom"
          delay={300}
        >
          <div>
            <Button isIconOnly variant="light" onPress={() => {
              setAuthOpen(true);
              onOpenChange?.(false);
            }}>
              <FontAwesomeIcon icon={faRightToBracket} className="text-lg" />
            </Button>
          </div>
        </Tooltip>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  return (
    <Dropdown placement="bottom-end" isOpen={isOpen} onOpenChange={onOpenChange}>
      <Tooltip
        content={user.name ?? user.email}
        placement="bottom"
        delay={300}
      >
        <div>
          <DropdownTrigger>
            <Button isIconOnly variant="light">
              <FontAwesomeIcon icon={faUser} className="text-lg" />
            </Button>
          </DropdownTrigger>
        </div>
      </Tooltip>

      <DropdownMenu aria-label="User menu">
        <DropdownItem key="logout" color="danger" onPress={logout}>
          {t("common:auth.logout", "Logout")}
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};

export default UserDropdown;
