import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Tabs, Tab, Spinner } from "@heroui/react";
import { ClassDataProvider, useClassData } from "@/context/ClassDataContext.tsx";
import {getStaticUrl} from "@/utils/url.ts";
import {useTheme} from "@/context/ThemeContext.tsx";
import {useTranslation} from "react-i18next";


function Page() {
  const { classes, loading } = useClassData();
  const {realTheme} = useTheme();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="text-default-600">No classes found.</div>
      </div>
    );
  }

  // Pick a default selected key (HeroUI Tabs expects string/number keys)
  const defaultKey = String(classes[0].name);

  return (
    <div className="mx-auto px-4 py-6">
      <Tabs
        aria-label="Class tabs"
        defaultSelectedKey={defaultKey}
        variant="underlined"
        color={realTheme == "light" ? "primary" : "default"}
        className="w-full border-gray-300 bg-transparent"
        classNames={{
          tabList: "flex w-full",
          tab: "h-[60px] flex-1 justify-center",
          tabContent: "flex items-center justify-center text-default-700",
        }}
      >
        {classes.map((cls) => {
          const key = String(cls.name);
          const iconUrl = getStaticUrl(`UI/Resource/Texture/Icon/UT_Class_${cls.name}_Large.webp`)

          return (
            <Tab
              key={key}
              title={
                <div className="flex items-center gap-3">
                  <div className="w-[60px] h-[60px] overflow-hidden shrink-0">
                    <img
                      src={iconUrl}
                      alt={`${cls.name} icon`}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </div>

                  <div className="flex flex-col items-start leading-tight">
                    <div className="text-[18px] font-semibold">{t(`classes:${cls.name}.name`)}</div>
                  </div>
                </div>
              }
            >
              {/* Tab content placeholder for now */}
              {/*<div className="py-4 text-default-600">*/}
              {/*  Selected class: <span className="font-medium">{cls.name}</span>*/}
              {/*</div>*/}
            </Tab>
          );
        })}
      </Tabs>



    </div>
  );
}

const PageWrapper: React.FC = () => {
  return (
    <ClassDataProvider>
      <Page />
    </ClassDataProvider>
  );
};

export const Route = createFileRoute("/class")({
  component: PageWrapper,
});
