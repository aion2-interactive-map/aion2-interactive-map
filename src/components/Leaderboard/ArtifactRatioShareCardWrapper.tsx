import React, { useState, useEffect, useRef } from "react";

interface ArtifactRatioShareCardWrapperProps {
  children: React.ReactNode;
  baseWidth?: number;
  baseHeight?: number;
  padding?: number;
  isMobile?: boolean;
}

const ArtifactRatioShareCardWrapper = React.forwardRef<HTMLDivElement, ArtifactRatioShareCardWrapperProps>(({ 
  children, 
  baseWidth = 1680, 
  baseHeight = 986,
  padding = 40,
  isMobile = false
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.offsetWidth - padding * 2;
        const availableHeight = containerRef.current.offsetHeight - padding * 2;
        
        const scaleW = availableWidth / baseWidth;
        const scaleH = availableHeight / baseHeight;
        
        let newScale;
        if (isMobile && availableWidth < baseWidth) {
          // On mobile, if screen is smaller than baseWidth (750px), scale to fit width
          newScale = scaleW;
        } else {
          // Use fit both width and height, but allow scaling up (zoom)
          newScale = Math.min(scaleW, scaleH);
        }
        setScale(newScale);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [baseWidth, baseHeight, padding, isMobile]);

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full overflow-x-auto overflow-y-auto no-scrollbar ${!isMobile ? "flex items-center justify-center overflow-hidden" : "flex flex-col items-center"}`}
    >
      <div 
        ref={ref}
        style={{ 
          width: `${baseWidth}px`, 
          height: `${baseHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: isMobile ? "top center" : "center center",
          flexShrink: 0,
          marginTop: isMobile ? `${padding}px` : undefined,
          marginBottom: isMobile ? `${padding}px` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
});

export default ArtifactRatioShareCardWrapper;
