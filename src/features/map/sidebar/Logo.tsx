import { useTranslation } from "react-i18next";
import { getStaticUrl } from "@/lib/url";

/**
 * Sidebar logo: a logo image next to the multi-line site title.
 * Faithful port of the old Logo component. `siteTitle` may contain a `\n`
 * which becomes a line break.
 */
export default function Logo() {
  const { t } = useTranslation(["common"]);
  const logoUrl = getStaticUrl("images/Logo.webp");
  const title = t("common:siteTitle", "AION2\nInteractive Map");

  return (
    <div className="flex w-full select-none items-center justify-center gap-6">
      <img
        src={logoUrl}
        alt="AION2 Logo"
        className="h-[100px] w-[100px] object-contain"
      />
      <div className="text-center text-[22px] font-bold leading-[30px] text-primary">
        {title.split("\n").map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}
