// src/routes/character/index.tsx
import React from "react";
import {z} from "zod";
import {createFileRoute} from "@tanstack/react-router";
import {ServerDataProvider} from "@/context/ServerDataContext.tsx";
import CharacterSearch from "@/components/Character/CharacterSearch.tsx";
import {CharacterProvider} from "@/context/CharacterContext.tsx";
import CharacterDetail from "@/components/Character/CharacterDetail.tsx";
import {ItemDataProvider} from "@/context/ItemDataContext.tsx";

function Page() {
  return (
    <div className="h-full overflow-y-auto bg-chacracter-page">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <CharacterSearch/>
        <CharacterDetail/>
      </div>
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
});

export const Route = createFileRoute("/character")({
  validateSearch: CharacterSearchSchema,
  component: PageWrapper,
});