import React from "react";
import SidebarWrapper from "./SidebarWrapper";
import Logo from "./Logo.tsx";

const LeftSidebar: React.FC = () => {
  return (
    <SidebarWrapper side="left" width={370}>
      <Logo/>
    </SidebarWrapper>
  );
};

export default LeftSidebar;
