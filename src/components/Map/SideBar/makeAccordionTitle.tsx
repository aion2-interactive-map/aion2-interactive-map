// src/components/Sidebar/makeAccordionTitle.tsx
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDiamond } from "@fortawesome/free-solid-svg-icons";

/**
 * Builds a styled AccordionItem title with a fixed icon.
 */
export function makeAccordionTitle(label: React.ReactNode): React.ReactNode {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-4 w-4 items-center justify-center">
        <FontAwesomeIcon icon={faDiamond} className="text-primary" />
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}
