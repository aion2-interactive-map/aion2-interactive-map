import React from "react";
import { getStaticUrl } from "@/utils/url.ts";

interface PageBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

const PageBackground: React.FC<PageBackgroundProps> = ({ children, className = "" }) => {
  return (
    <div
      className={`h-full overflow-y-auto flex flex-col bg-[var(--color-leaderboard-page)] 
        bg-[image:var(--bg-grid-image)] bg-repeat
        dark:bg-[image:var(--bg-dark-image),var(--background-image-page)] 
        dark:bg-[size:100%_auto,auto] dark:bg-no-repeat ${className}`}
      style={{
        "--bg-grid-image": `url(${getStaticUrl("images/Background/Grid.webp")})`,
        "--bg-dark-image": `url(${getStaticUrl("images/Background/Dark.webp")})`,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

export default PageBackground;
