import React, { useState, useEffect, useRef } from "react";

interface ArtifactRatioShareCardWrapperProps {
  children: React.ReactNode;
  baseWidth?: number;
  baseHeight?: number;
  padding?: number;
}

const ArtifactRatioShareCardWrapper: React.FC<ArtifactRatioShareCardWrapperProps> = ({ 
  children, 
  baseWidth = 1680, 
  baseHeight = 986,
  padding = 40
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.offsetWidth - padding * 2;
        const availableHeight = containerRef.current.offsetHeight - padding * 2;
        
        const scaleW = availableWidth / baseWidth;
        const scaleH = availableHeight / baseHeight;
        
        // Use fit both width and height, but allow scaling up (zoom)
        const newScale = Math.min(scaleW, scaleH);
        setScale(newScale);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [baseWidth, baseHeight, padding]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full flex items-center justify-center overflow-hidden"
    >
      <div 
        style={{ 
          width: `${baseWidth}px`, 
          height: `${baseHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ArtifactRatioShareCardWrapper;
