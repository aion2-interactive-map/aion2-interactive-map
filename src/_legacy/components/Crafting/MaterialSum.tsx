import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDatabase } from "@fortawesome/free-solid-svg-icons";

export type MaterialSumProps = {
  label: string;
  value: number;
  className?: string;
};

export const MaterialSum: React.FC<MaterialSumProps> = ({ label, value, className = "" }) => {
  return (
    <div className={`relative h-[38px] rounded-lg border border-primary dark:border-crafting-border bg-crafting-sum ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 text-[16px] font-bold text-primary dark:text-default-800">
          <FontAwesomeIcon icon={faDatabase} className="text-sm" />
          {label}
          {value.toLocaleString()}
        </div>
      </div>
    </div>
  );
};
