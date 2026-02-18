import React from "react";
import {Chip} from "@heroui/react";
import PopConfirm from "@/components/PopConfirm";

interface ArtifactAdminChipProps {
  admin: {
    id: string;
    user: {
      id: string;
      email: string;
      name: string;
    };
  };
  isSuperUser: boolean;
  onDelete: (userId: string) => void;
  t: any;
}

const ArtifactAdminChip: React.FC<ArtifactAdminChipProps> = ({ admin, isSuperUser, onDelete, t }) => {
  return (
    <PopConfirm
      title={t("common:ui.confirmDelete")}
      onConfirm={() => onDelete(admin.user.id)}
    >
      <Chip
        variant="flat"
        color="primary"
        onClose={isSuperUser ? () => {} : undefined}
      >
        {admin.user.name || admin.user.email}
      </Chip>
    </PopConfirm>
  );
};

export default ArtifactAdminChip;
