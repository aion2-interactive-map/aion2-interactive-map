// src/components/CharacterSearch.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Autocomplete, AutocompleteItem, Select, SelectItem } from "@heroui/react";
import { useServerData } from "@/context/ServerDataContext.tsx";
import { useTranslation } from "react-i18next";
import { computeBaseUrl } from "@/utils/dataMode.ts";
import {useCharacter} from "@/context/CharacterContext.tsx";

type CharacterSearchItem = {
  id: string;
  name: string;
  race: number;
  level: number;
  serverId: number;
  serverName: string;
  profileImageUrl: string;
};

type ServerOption = {
  key: string;
  label: string;
};

export default function CharacterSearch() {
  const { servers, loading: serversLoading } = useServerData();
  const {selectCharacter} = useCharacter();
  const { t } = useTranslation();

  const [raceId, setRaceId] = useState<"1" | "2">("1");
  const [serverId, setServerId] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchItems, setSearchItems] = useState<CharacterSearchItem[]>([]);
  const lastReqIdRef = useRef(0);

  const serversForRace = useMemo(() => {
    const rid = Number(raceId);
    return servers.filter((s) => s.raceId === rid);
  }, [servers, raceId]);

  useEffect(() => {
    if (serverId === "all") return;
    const ok = serversForRace.some((s) => String(s.serverId) === serverId);
    if (!ok) setServerId("all");
  }, [serversForRace, serverId]);

  useEffect(() => {
    const k = keyword.trim();
    const rid = Number(raceId);
    const sid = serverId === "all" ? undefined : Number(serverId);

    setSearchItems([]);
    if (!k || !rid) return;

    const reqId = ++lastReqIdRef.current;
    const timer = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        const items = await fetchCharacters({ keyword: k, raceId: rid, serverId: sid });
        if (lastReqIdRef.current !== reqId) return;
        setSearchItems(items);
      } catch (e) {
        console.error(e);
        if (lastReqIdRef.current === reqId) setSearchItems([]);
      } finally {
        if (lastReqIdRef.current === reqId) setSearchLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [keyword, raceId, serverId]);

  async function fetchCharacters(params: {
    keyword: string;
    serverId?: number;
    raceId: number;
  }): Promise<CharacterSearchItem[]> {
    const base =
      computeBaseUrl() +
      `/characters/search?race=${params.raceId}&keyword=${encodeURIComponent(params.keyword)}`;
    const url = params.serverId ? `${base}&server=${params.serverId}` : base;

    const resp = await fetch(url, { method: "GET" });
    if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);

    const json = (await resp.json()) as {
      data?: { results?: Array<CharacterSearchItem> };
    };

    return json.data?.results ?? [];
  }

  const generateServerLabel = useCallback(
    (serverName: string, raceId: number, serverId: number) => {
      const serverDisplayId = serverId % 1000;
      const raceAbbr =
        raceId === 1
          ? t("common:server.lightAbbr", "Light ")
          : t("common:server.darkAbbr", "Dark ");
      return `${serverName} (${raceAbbr}${serverDisplayId})`;
    },
    [t]
  );

  const serverOptions = useMemo<ServerOption[]>(() => {
    const opts: ServerOption[] = [{ key: "all", label: t("common:server.allServers", "All servers") }];
    for (const s of serversForRace) {
      opts.push({
        key: String(s.serverId),
        label: generateServerLabel(s.serverName, s.raceId, s.serverId),
      });
    }
    return opts;
  }, [serversForRace, t, generateServerLabel]);

  const inputWrapperClassName = `
    !bg-character-input hover:!bg-character-input focus:!bg-character-input !transition-none 
    border-1 border-crafting-border shadow-none
    group-data-[hover=true]:!bg-character-input
    group-data-[focus=true]:!bg-character-input
    group-data-[focus-visible=true]:!bg-character-input
    group-data-[invalid=true]:!bg-character-input
  `;

  const autocompleteInputClassNames = {
    // base: "flex-1 min-w-[320px]",
    inputWrapper: inputWrapperClassName,
    innerWrapper: "h-10 py-0",
    // popoverContent: "rounded-[4px]"
  };

  const selectClassNames = {
    trigger: inputWrapperClassName + "border-r-0",
    innerWrapper: "h-10 py-0",
  };

  return (
      <div className="flex flex-row gap-0 items-end w-full justify-end">
        {/* 1) Race */}
        <Select
          placeholder={t("common:server.race", "Race")}
          isRequired
          selectedKeys={new Set([raceId])}
          onSelectionChange={(keys) => {
            const v = keys.currentKey;
            if (v === "1" || v === "2") setRaceId(v);
          }}
          className="w-[100px] flex-none"
          radius="none"
          classNames={selectClassNames}
        >
          <SelectItem key="1">{t("common:server.light", "Light")}</SelectItem>
          <SelectItem key="2">{t("common:server.dark", "Dark")}</SelectItem>
        </Select>

        {/* 2) Server */}
        <Select
          placeholder={t("common:server.server", "Server")}
          isRequired={false}
          isDisabled={serversLoading || serversForRace.length === 0}
          items={serverOptions}
          selectedKeys={new Set([serverId])}
          onSelectionChange={(keys) => {
            const v = keys.currentKey;
            setServerId(v ? String(v) : "all");
          }}
          className="w-[160px] flex-none"
          renderValue={(items) => items[0]?.textValue ?? ""}
          radius="none"
          classNames={selectClassNames}
        >
          {(item) => (
            <SelectItem key={item.key} textValue={item.label}>
              {item.label}
            </SelectItem>
          )}
        </Select>

        {/* 3) Character keyword autocomplete */}
        <Autocomplete
          placeholder={t("common:server.search", "Type to search...")}
          inputValue={keyword}
          onInputChange={setKeyword}
          onSelectionChange={(key) => {
            const item = searchItems.find((x) => x.id === key);
            if (item) selectCharacter({ serverId: item.serverId, characterId: item.id });
          }}
          isDisabled={serversLoading}
          isLoading={searchLoading}
          items={searchItems}
          className="w-[180px] flex-none"
          radius="none"
          inputProps={{classNames: autocompleteInputClassNames}}
        >
          {(item) => (
            <AutocompleteItem key={item.id} textValue={item.name}>
              <div className="flex items-center gap-2 w-full">
                <img
                  src={`https://profileimg.plaync.com${item.profileImageUrl}`}
                  alt={item.name}
                  className="w-[40px] h-[40px] object-cover rounded-md shrink-0"
                  draggable={false}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="truncate text-default-800">{item.name}</span>
                    <span className="shrink-0 text-default-600">Lv.{item.level}</span>
                  </div>
                  <div className="truncate text-xs text-default-700">
                    {item.serverName}
                  </div>
                </div>
              </div>
            </AutocompleteItem>
          )}
        </Autocomplete>
      </div>

  );
}
