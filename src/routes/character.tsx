// src/routes/character/index.tsx
import React from "react";
import {z} from "zod";
import {createFileRoute} from "@tanstack/react-router";
import {ServerDataProvider} from "@/context/ServerDataContext.tsx";
import {CharacterProvider} from "@/context/CharacterContext.tsx";
import {ItemDataProvider} from "@/context/ItemDataContext.tsx";

import CharacterSearch from "@/components/Character/CharacterSearch.tsx";
import CharacterDetail from "@/components/Character/CharacterDetail.tsx";
import Footer from "@/components/Footer.tsx";


function Page() {
  return (
    <div className="h-full overflow-y-auto bg-chacracter-page flex flex-col">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4 flex-1 w-full">
        <CharacterSearch/>
        <CharacterDetail/>
      </div>
      <Footer />
    </div>
  );
}

const PageWrapper: React.FC = () => {
  return (
    <ItemDataProvider>
      <CharacterProvider>
        <ServerDataProvider>
          <Page/>
        </ServerDataProvider>
      </CharacterProvider>
    </ItemDataProvider>
  );
};

const CharacterSearchSchema = z.object({
  serverId: z.coerce.number().optional(),
  characterId: z.string().optional(),
  region: z.string().optional(),
});

export const Route = createFileRoute("/character")({
  validateSearch: CharacterSearchSchema,
  component: PageWrapper,
});