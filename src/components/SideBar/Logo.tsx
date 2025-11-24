// src/components/LeftSidebar/Logo.tsx
import React from "react";
import { getStaticUrl } from "@/utils/url";
import {useTranslation} from "react-i18next";

const Logo: React.FC = () => {
  const { t } = useTranslation();
  const logoUrl = getStaticUrl("images/Logo.webp");

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Image */}
      <img
        src={logoUrl}
        alt="AION2 Logo"
        className="w-[100px] h-[100px] object-contain"
      />

      {/* Title */}
      <div className="mt-5 text-[22px] leading-[22px] font-bold text-primary text-center">
        {t("common:siteTitle", "AION2 Interactive Map")}
      </div>
    </div>
  );
};

export default Logo;
