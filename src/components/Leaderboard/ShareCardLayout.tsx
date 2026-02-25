import React from "react";
import { getStaticUrl } from "@/utils/url";

interface ShareCardLayoutProps {
  children: React.ReactNode;
  isMobile?: boolean;
  title: string;
  subtitle: string;
  footerContent?: React.ReactNode;
}

const ShareCardLayout = React.forwardRef<HTMLDivElement, ShareCardLayoutProps>(({
  children,
  isMobile = false,
  title,
  subtitle,
  footerContent,
}, ref) => {
  const cardWidth = isMobile ? "w-[750px]" : "w-[1680px]";

  const DefaultFooter = () => (
    isMobile ? (
      <div className="relative z-10 mt-2.5 flex flex-col items-center gap-2.5 text-white text-[28px]">
        <span>神器交流群：1073046733</span>
        <div className="flex items-center gap-5">
          <span>https://tc-imba.com</span>
          <div className="w-px h-[28px] bg-white" />
          <span>© 2025-2026 星狐攻略组</span>
        </div>
      </div>
    ) : (
      <div className="relative z-10 mt-2.5 flex justify-center items-center gap-5 text-white text-sm">
        <span>https://tc-imba.com</span>
        <div className="w-px h-4 bg-white" />
        <span>© 2025-2026 星狐攻略组</span>
        <div className="w-px h-4 bg-white" />
        <span>神器交流群：1073046733</span>
      </div>
    )
  );

  return (
    <div 
      ref={ref}
      className={`relative flex flex-col overflow-hidden ${cardWidth} h-fit bg-[#4C2C7E] ${isMobile ? "p-[25px]" : "p-5"} gap-2.5`}
    >
      {/* Background Image */}
      <img 
        src={getStaticUrl(isMobile ? "/images/Leaderboards/ExportBackgroundMobile.webp" : "/images/Leaderboards/ExportBackground.webp")} 
        alt="Background" 
        className="absolute inset-x-0 top-0 w-full h-auto object-contain pointer-events-none"
      />

      {/* Top Header */}
      <div 
        className={`relative z-10 flex ${isMobile ? "flex-col gap-10 h-auto pb-2.5" : "items-center gap-6 h-[110px] px-2.5 pb-1"} shrink-0`}
      >
        {isMobile ? (
          <>
            {/* First line: Logos */}
            <div className="flex items-center gap-4 h-[120px]">
              <img 
                src={getStaticUrl("/images/Logo.webp")} 
                alt="Logo" 
                className="h-[120px] w-auto object-contain"
              />
              <img 
                src={getStaticUrl("/images/GroupLogoDark.webp")} 
                alt="Group Logo" 
                className="h-[76px] w-auto object-contain"
              />
            </div>
            {/* Second line: Title and Info */}
            <div className="flex flex-col gap-[20px]">
              <div className="text-[36px] font-bold text-white leading-none">
                {title}
              </div>
              <div className="flex flex-col gap-2 bg-black/20 rounded-lg px-2 py-2 w-fit">
                {(() => {
                  const parts = subtitle.split(" | ");
                  if (parts.length > 2) {
                    return (
                      <>
                        <div key="line1" className="text-[28px] text-white/80 leading-tight flex items-center h-[48px]">
                          {parts[0]} | {parts[1]}
                        </div>
                        <div key="line2" className="text-[28px] text-white/80 leading-tight flex items-center h-[48px]">
                          {parts[2]}
                        </div>
                      </>
                    );
                  }
                  return parts.map((part, index) => (
                    <div key={index} className="text-[28px] text-white/80 leading-tight flex items-center h-[48px]">
                      {part}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </>
        ) : (
          <>
            <img 
              src={getStaticUrl("/images/Logo.webp")} 
              alt="Logo" 
              className="h-full w-auto object-contain"
            />
            <img 
              src={getStaticUrl("/images/GroupLogoDark.webp")} 
              alt="Group Logo" 
              className="h-[69px] w-auto object-contain"
            />
            <div className="flex flex-col justify-center gap-1.5">
              <div className="text-3xl font-bold text-white leading-tight">
                {title}
              </div>
              <div className="text-sm text-white/80 leading-tight bg-black/20 rounded-lg px-2 py-0.5 w-fit">
                {subtitle}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full h-fit">
        {children}
      </div>

      {/* Footer */}
      {footerContent || <DefaultFooter />}
    </div>
  );
});

ShareCardLayout.displayName = "ShareCardLayout";

export default ShareCardLayout;
