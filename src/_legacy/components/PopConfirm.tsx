import React from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
} from "@heroui/react";
import { useTranslation } from "react-i18next";

interface PopConfirmProps {
  children: React.ReactNode;
  title: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
}

const PopConfirm: React.FC<PopConfirmProps> = ({
  children,
  title,
  onConfirm,
  confirmText,
  cancelText,
  color = "danger",
}) => {
  const { t } = useTranslation("common");
  const [isOpen, setIsOpen] = React.useState(false);

  const handleConfirm = () => {
    onConfirm();
    setIsOpen(false);
  };

  return (
    <Popover isOpen={isOpen} onOpenChange={(open) => setIsOpen(open)} placement="top">
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="text-sm font-medium">{title}</div>
          <div className="flex justify-center gap-2">
            <Button
              size="sm"
              variant="flat"
              onClick={() => setIsOpen(false)}
            >
              {cancelText || t("ui.cancel")}
            </Button>
            <Button
              size="sm"
              color={color}
              onClick={handleConfirm}
            >
              {confirmText || t("ui.confirm")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PopConfirm;
