import React from "react";
import SidebarWrapper from "./SidebarWrapper";

const RightSidebar: React.FC = () => {
  return (
    <SidebarWrapper side="right" width={370}>
      {/* 👉 Put your RIGHT sidebar content here */}
      <div className="p-4 space-y-4">
        <h2 className="text-sm font-semibold">Right Sidebar</h2>
        <p className="text-xs text-default-600">Insert content here...</p>
      </div>
    </SidebarWrapper>
  );
};

export default RightSidebar;
