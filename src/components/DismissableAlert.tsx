// src/components/DismissableAlert.tsx
import React, { useEffect } from "react";
import { Alert, Button } from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faTriangleExclamation  } from "@fortawesome/free-solid-svg-icons";

export type DismissableAlertProps = {
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  autoCloseAfterMs?: number; // optional auto-close
};

const DismissableAlert: React.FC<DismissableAlertProps> = ({
                                                             color = "warning",
                                                             title,
                                                             children,
                                                             onClose,
                                                             autoCloseAfterMs,
                                                           }) => {

  // Optionally auto-dismiss
  useEffect(() => {
    if (!autoCloseAfterMs) return;
    const timer = setTimeout(onClose, autoCloseAfterMs);
    return () => clearTimeout(timer);
  }, [autoCloseAfterMs, onClose]);

  return (
    <Alert
      color={color}
      variant="solid"
      hideIcon
      startContent={<FontAwesomeIcon icon={faTriangleExclamation} className="text-[20px]" />}
      className="py-1 px-3 text-xs rounded-md shadow-lg bg-warning"
    >
      {/* Flex row: text on left, X button on right */}
      <div className="flex w-full items-center justify-between gap-3">

        {/* Text block */}
        <div className="flex flex-col gap-1 min-w-0">
          {title && <div className="font-semibold text-sm">{title}</div>}
          <div className="text-xs">{children}</div>
        </div>

        {/* X button */}
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={onClose}
          className="!min-w-6 !h- 6 flex-shrink-0"
        >
          <FontAwesomeIcon icon={faTimes} className="text-sm" />
        </Button>
      </div>
    </Alert>
  );
};

export default DismissableAlert;
