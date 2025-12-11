import React from "react";
import { Card } from "@heroui/react";
import {useTranslation} from "react-i18next";

const UnderConstruction: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex justify-center items-center h-full  bg-background my-auto">
      <Card className="w-full max-w-lg p-10 text-center">
        <p className="text-xl font-semibold text-default-800 mb-4">
          {t("common:wip.title", "This page is under construction!")}
        </p>
        <p className="text-sm text-default-700 mb-6">
          {t("common:wip.content", "We're working hard to bring you this feature. Please check back later.")}
        </p>
      </Card>
    </div>
  );
};

export default UnderConstruction;
