// src/components/LeftSidebar/Logo.tsx
import React from "react";
import { getStaticUrl } from "@/utils/url";
import { useTranslation } from "react-i18next";

const Logo: React.FC = () => {
  const { t } = useTranslation();
  const logoUrl = getStaticUrl("images/Logo.webp");
  const titleWithLineBreak = t("common:siteTitle", "AION2\nInteractive Map").replace(
    /\n/g,
    "<br />"
  );
  return (
    <div className="w-full flex items-center justify-center select-none gap-6">
      {/* Image */}
      <img
        src={logoUrl}
        alt="AION2 Logo"
        className="w-[100px] h-[100px] object-contain" // Adjust logo size and margin
      />

      {/* Title */}
      <div
        className="text-[22px] leading-[30px] font-bold text-primary text-center"
        dangerouslySetInnerHTML={{
          __html: titleWithLineBreak
        }}
      >
      </div>
    </div>
  );
};

export default Logo;
