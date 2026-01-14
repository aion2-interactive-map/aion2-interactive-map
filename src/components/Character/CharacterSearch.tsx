// src/components/CharacterSearch.tsx
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Autocomplete, AutocompleteItem, Select, SelectItem, Input, Card, CardBody, Spinner} from "@heroui/react";
import {useTranslation} from "react-i18next";
import {computeBaseUrl} from "@/utils/dataMode.ts";
import {useDebounce} from "@/hooks/useDebounce";
import {SEARCH_DEBOUNCE_MS} from "@/constants";
import {useServerData} from "@/context/ServerDataContext.tsx";
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
  const {servers, loading: serversLoading} = useServerData();
  const {selectCharacter, characterId: currentCharacterId} = useCharacter();
  const {t} = useTranslation();

  const [raceId, setRaceId] = useState<"1" | "2">("1");
  const [serverId, setServerId] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, SEARCH_DEBOUNCE_MS);
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
    const k = debouncedKeyword.trim();
    const rid = Number(raceId);
    const sid = serverId === "all" ? undefined : Number(serverId);

    setSearchItems([]);
    if (!k || !rid) return;

    const reqId = ++lastReqIdRef.current;

    const runSearch = async () => {
      try {
        setSearchLoading(true);
        const items = await fetchCharacters({keyword: k, raceId: rid, serverId: sid});
        if (lastReqIdRef.current !== reqId) return;
        setSearchItems(items);
      } catch (e) {
        console.error(e);
        if (lastReqIdRef.current === reqId) setSearchItems([]);
      } finally {
        if (lastReqIdRef.current === reqId) setSearchLoading(false);
      }
    };

    void runSearch();
  }, [debouncedKeyword, raceId, serverId]);

  async function fetchCharacters(params: {
    keyword: string;
    serverId?: number;
    raceId: number;
  }): Promise<CharacterSearchItem[]> {
    const base =
      computeBaseUrl() +
      `/characters/search?race=${params.raceId}&keyword=${encodeURIComponent(params.keyword)}`;
    const url = params.serverId ? `${base}&server=${params.serverId}` : base;

    const resp = await fetch(url, {method: "GET"});
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
    const opts: ServerOption[] = [{key: "all", label: t("common:server.allServers", "All servers")}];
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

  if (!currentCharacterId) {
    return (
      <div className="flex flex-col w-full space-y-8 pt-10 min-h-[600px]">
        <div className="flex flex-col">
          <h1 className="text-[22px] font-bold text-foreground">搜寻AION2角色</h1>
          <p className="text-[14px] text-default-800 mt-2">查詢角色詳細資訊與評分</p>
        </div>

        <div className="flex flex-col items-center w-full space-y-4 max-w-2xl mx-auto">
          <Input
            placeholder={t("common:server.search", "Type to search...")}
            value={keyword}
            onValueChange={setKeyword}
            classNames={{
              inputWrapper: inputWrapperClassName.replace("!transition-none", "") + " h-12",
              input: "text-lg"
            }}
            size="lg"
            radius="sm"
            isClearable
          />
          <div className="flex w-full gap-4">
            <Select
              placeholder={t("common:server.race", "Race")}
              isRequired
              selectedKeys={new Set([raceId])}
              onSelectionChange={(keys) => {
                const v = keys.currentKey;
                if (v === "1" || v === "2") setRaceId(v);
              }}
              className="flex-1"
              radius="sm"
              classNames={{
                trigger: inputWrapperClassName.replace("!transition-none", "") + " h-12",
              }}
              size="lg"
            >
              <SelectItem key="1">{t("common:server.light", "Light")}</SelectItem>
              <SelectItem key="2">{t("common:server.dark", "Dark")}</SelectItem>
            </Select>

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
              className="flex-1"
              renderValue={(items) => items[0]?.textValue ?? ""}
              radius="sm"
              classNames={{
                trigger: inputWrapperClassName.replace("!transition-none", "") + " h-12",
              }}
              size="lg"
            >
              {(item) => (
                <SelectItem key={item.key} textValue={item.label}>
                  {item.label}
                </SelectItem>
              )}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {searchItems.map((item) => (
            <Card
              key={item.id}
              isPressable
              onPress={() => selectCharacter({serverId: item.serverId, characterId: item.id})}
              className="bg-character-card border-1 border-crafting-border hover:border-primary transition-colors"
              shadow="sm"
            >
              <CardBody className="p-3 overflow-hidden">
                <div className="flex items-center gap-3">
                  <img
                    src={`https://profileimg.plaync.com${item.profileImageUrl}`}
                    alt={item.name}
                    className="w-[48px] h-[48px] object-cover rounded-md shrink-0"
                    draggable={false}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-baseline gap-1">
                      <span className="truncate text-base font-bold text-foregound">{item.name}</span>
                    </div>
                    <div className="truncate text-sm text-default-800 mt-0.5">
                      {item.serverName} | Lv.{item.level}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
          {searchLoading && (
            <div className="col-span-full flex justify-center py-10">
              <Spinner color="primary" label="Searching characters..."/>
            </div>
          )}
          {!searchLoading && keyword.trim() !== "" && searchItems.length === 0 && (
            <div className="col-span-full flex justify-center py-10">
              <span className="text-default-500">No characters found for "{keyword}"</span>
            </div>
          )}
        </div>
      </div>
    );
  }

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
          if (item) selectCharacter({serverId: item.serverId, characterId: item.id});
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
