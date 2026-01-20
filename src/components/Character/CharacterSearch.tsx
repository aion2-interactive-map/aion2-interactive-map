// src/components/CharacterSearch.tsx
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Autocomplete, AutocompleteItem, Select, SelectItem, Input, Card, CardBody, Spinner, Button} from "@heroui/react";
import {useTranslation} from "react-i18next";
import {computeBaseUrl} from "@/utils/dataMode.ts";
import {useDebounce} from "@/hooks/useDebounce";
import {SEARCH_DEBOUNCE_MS, CHARACTER_HISTORY_STORAGE_PREFIX, CHARACTER_STARRED_STORAGE_PREFIX} from "@/constants";
import {useServerData} from "@/context/ServerDataContext.tsx";
import {useCharacter} from "@/context/CharacterContext.tsx";
import type {CharacterSearchItem} from "@/types/character.ts";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faStar} from "@fortawesome/free-solid-svg-icons";

type ServerOption = {
  key: string;
  label: string;
};

export default function CharacterSearch() {
  const {servers, loading: serversLoading} = useServerData();
  const {selectCharacter, characterId: currentCharacterId, region: currentRegion} = useCharacter();
  const {t} = useTranslation();

  const [region, setRegion] = useState<string>(currentRegion || "tw");
  const [raceId, setRaceId] = useState<"1" | "2">("1");
  const [serverId, setServerId] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, SEARCH_DEBOUNCE_MS);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchItems, setSearchItems] = useState<CharacterSearchItem[]>([]);
  const [historyItems, setHistoryItems] = useState<CharacterSearchItem[]>([]);
  const [starredItems, setStarredItems] = useState<CharacterSearchItem[]>([]);
  const lastReqIdRef = useRef(0);

  useEffect(() => {
    const historyStr = localStorage.getItem(CHARACTER_HISTORY_STORAGE_PREFIX);
    if (historyStr) {
      try {
        const history = JSON.parse(historyStr);
        // Only include items that are full CharacterSearchItem (have 'name' property)
        const validHistory = history.filter((item: any) => item.name).map((item: any) => ({
          ...item,
          region: item.region || "tw"
        }));
        // Deduplicate in case storage still has duplicates
        const uniqueHistory = validHistory.filter((item: any, index: number, self: any[]) =>
          index === self.findIndex((t) => (
            t.id === item.id && t.serverId === item.serverId
          ))
        );
        setHistoryItems(uniqueHistory);
      } catch (e) {
        console.error("Failed to parse character history", e);
      }
    }

    const starredStr = localStorage.getItem(CHARACTER_STARRED_STORAGE_PREFIX);
    if (starredStr) {
      try {
        const starred = JSON.parse(starredStr);
        setStarredItems(starred.map((item: any) => ({
          ...item,
          region: item.region || "tw"
        })));
      } catch (e) {
        console.error("Failed to parse starred characters", e);
      }
    }
  }, [currentCharacterId]);

  useEffect(() => {
    if (currentRegion) {
      setRegion(currentRegion);
    }
  }, [currentRegion]);

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
    let k = debouncedKeyword.trim();
    let rid = Number(raceId);
    let sid = serverId === "all" ? undefined : Number(serverId);

    // Support name[serverShortName] format
    const match = k.match(/^(.+)\[(.+)]$/);
    if (match) {
      const [, name, serverShortName] = match;
      const foundServer = servers.find(s => s.serverShortName === serverShortName || s.serverName === serverShortName);
      if (foundServer) {
        k = name;
        rid = foundServer.raceId;
        sid = foundServer.serverId;
      }
    }

    setSearchItems([]);
    if (!k || !rid) return;

    const reqId = ++lastReqIdRef.current;

    const runSearch = async () => {
      try {
        setSearchLoading(true);
        const items = await fetchCharacters({keyword: k, raceId: rid, serverId: sid, region});
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
  }, [debouncedKeyword, raceId, serverId, region, servers]);

  async function fetchCharacters(params: {
    keyword: string;
    serverId?: number;
    raceId: number;
    region: string;
  }): Promise<CharacterSearchItem[]> {
    const base =
      computeBaseUrl() +
      `/characters/search?race=${params.raceId}&keyword=${encodeURIComponent(params.keyword)}&region=${params.region}`;
    const url = params.serverId ? `${base}&server=${params.serverId}` : base;

    const resp = await fetch(url, {method: "GET"});
    if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);

    const json = (await resp.json()) as {
      data?: { results?: Array<CharacterSearchItem> };
    };

    return (json.data?.results ?? []).map(item => ({...item, region: params.region}));
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
    !bg-character-card hover:!bg-character-card focus:!bg-character-card !transition-none 
    border-crafting-border border-1 sm:border-r-0
    shadow-none rounded-sm sm:rounded-none
    group-data-[hover=true]:!bg-character-card
    group-data-[focus=true]:!bg-character-card
    group-data-[focus-visible=true]:!bg-character-card
    group-data-[invalid=true]:!bg-character-card
  `;

  const autocompleteInputClassNames = {
    inputWrapper: inputWrapperClassName,
    innerWrapper: "h-10 py-0",
    popoverContent: "rounded-none p-0"
  };

  const selectClassNames = {
    trigger: inputWrapperClassName,
    innerWrapper: "h-10 py-0",
    popoverContent: "rounded-none p-0"
  };

  const commonListboxProps = {
    itemClasses: {
      base: "rounded-none",
    },
  };

  const toggleStar = useCallback((e: React.MouseEvent, item: CharacterSearchItem) => {
    e.stopPropagation();
    setStarredItems(prev => {
      const isStarred = prev.some(s => s.id === item.id);
      let next;
      if (isStarred) {
        next = prev.filter(s => s.id !== item.id);
      } else {
        next = [item, ...prev];
      }
      localStorage.setItem(CHARACTER_STARRED_STORAGE_PREFIX, JSON.stringify(next));
      return next;
    });
  }, []);

  const renderCharacterCard = (item: CharacterSearchItem, keyPrefix: string) => {
    const isStarred = starredItems.some(s => s.id === item.id);
    return (
      <Card
        key={`${keyPrefix}-${item.id}`}
        isPressable
        onPress={() => selectCharacter({serverId: item.serverId, characterId: item.id, region: item.region, item})}
        className="bg-character-card border-1 border-crafting-border hover:border-primary transition-colors"
        shadow="sm"
      >
        <CardBody className="p-3 overflow-hidden relative">
          <Button
            isIconOnly
            variant="light"
            size="sm"
            className="absolute top-1 right-1 z-10 min-w-0 w-8 h-8"
            onClick={(e) => toggleStar(e, item)}
          >
            <FontAwesomeIcon
              icon={faStar}
              className={isStarred ? "text-warning" : "text-default-300"}
            />
          </Button>
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
    );
  };

  if (!currentCharacterId) {
    return (
      <div className="flex flex-col w-full space-y-8 pt-10 min-h-[600px]">
        <div className="flex flex-col">
          <h1 className="text-[22px] font-bold text-foreground">搜寻AION2角色</h1>
          <p className="text-[14px] text-default-800 mt-2">查詢角色詳細資訊</p>
        </div>

        <div className="flex flex-col items-center w-full space-y-4 max-w-2xl mx-auto">
          <Input
            placeholder={t("common:server.search", "Type to search...")}
            value={keyword}
            onValueChange={setKeyword}
            classNames={{
              inputWrapper: inputWrapperClassName + "!border-r-1",
              input: "text-lg"
            }}
            size="lg"
            radius="sm"
            isClearable
          />
          <div className="flex flex-row w-full gap-2 sm:gap-4">
            <Select
              placeholder={t("common:server.region", "Publisher")}
              isRequired
              selectedKeys={new Set([region])}
              onSelectionChange={(keys) => {
                const v = keys.currentKey;
                if (v) setRegion(String(v));
              }}
              className="flex-1"
              radius="sm"
              classNames={{
                trigger: inputWrapperClassName + "!border-r-1",
                popoverContent: "rounded-none p-0"
              }}
              popoverProps={{
                radius: "none",
              }}
              listboxProps={commonListboxProps}
              size="lg"
            >
              <SelectItem key="tw">{t("common:server.tw", "台服")}</SelectItem>
              <SelectItem key="kr">{t("common:server.kr", "韩服")}</SelectItem>
            </Select>

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
                trigger: inputWrapperClassName + "!border-r-1",
                popoverContent: "rounded-none p-0"
              }}
              popoverProps={{
                radius: "none",
              }}
              listboxProps={commonListboxProps}
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
              className="flex-[2]"
              renderValue={(items) => items[0]?.textValue ?? ""}
              radius="sm"
              classNames={{
                trigger: inputWrapperClassName + "!border-r-1",
                popoverContent: "rounded-none p-0"
              }}
              popoverProps={{
                radius: "none",
              }}
              listboxProps={commonListboxProps}
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
          {searchItems.map((item) => renderCharacterCard(item, "search"))}
          {searchLoading && (
            <div className="col-span-full flex justify-center py-10">
              <Spinner color="primary" label={t("common:server.searching", "Searching characters...")}/>
            </div>
          )}
          {!searchLoading && keyword.trim() !== "" && searchItems.length === 0 && (
            <div className="col-span-full flex justify-center py-10">
              <span className="text-default-800">
                {t("common:server.noResults", { keyword })}
              </span>
            </div>
          )}
        </div>

        {starredItems.length > 0 && (
          <div className="flex flex-col space-y-4">
            <h2 className="text-[18px] font-bold text-foreground">
              {t("common:server.starred", "Favorites")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
              {starredItems.map((item) => renderCharacterCard(item, "starred"))}
            </div>
          </div>
        )}

        {historyItems.length > 0 && (
          <div className="flex flex-col space-y-4">
            <h2 className="text-[18px] font-bold text-foreground">
              {t("common:server.history", "Search History")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
              {historyItems.map((item) => renderCharacterCard(item, "history"))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 items-stretch sm:items-end w-full justify-end">
      <div className="flex flex-row gap-2 sm:gap-0 flex-none sm:flex-none">
        {/* 0) Region */}
        <Select
          placeholder={t("common:server.region", "Region")}
          isRequired
          selectedKeys={new Set([region])}
          onSelectionChange={(keys) => {
            const v = keys.currentKey;
            if (v) setRegion(String(v));
          }}
          className="flex-1 sm:w-[100px] sm:flex-none"
          radius="none"
          popoverProps={{
            radius: "none",
          }}
          listboxProps={commonListboxProps}
          classNames={selectClassNames}
        >
          <SelectItem key="tw">{t("common:server.tw", "台服")}</SelectItem>
          <SelectItem key="kr">{t("common:server.kr", "韩服")}</SelectItem>
        </Select>

        {/* 1) Race */}
        <Select
          placeholder={t("common:server.race", "Race")}
          isRequired
          selectedKeys={new Set([raceId])}
          onSelectionChange={(keys) => {
            const v = keys.currentKey;
            if (v === "1" || v === "2") setRaceId(v);
          }}
          className="flex-1 sm:w-[100px] sm:flex-none"
          radius="none"
          popoverProps={{
            radius: "none",
          }}
          listboxProps={commonListboxProps}
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
          className="flex-[2] sm:w-[160px] sm:flex-none"
          renderValue={(items) => items[0]?.textValue ?? ""}
          radius="none"
          popoverProps={{
            radius: "none",
          }}
          listboxProps={commonListboxProps}
          classNames={selectClassNames}
        >
          {(item) => (
            <SelectItem key={item.key} textValue={item.label}>
              {item.label}
            </SelectItem>
          )}
        </Select>
      </div>

      {/* 3) Character keyword autocomplete */}
      <Autocomplete
        placeholder={t("common:server.search", "Type to search...")}
        inputValue={keyword}
        onInputChange={setKeyword}
        onSelectionChange={(key) => {
          const item = searchItems.find((x) => x.id === key);
          if (item) selectCharacter({serverId: item.serverId, characterId: item.id, region: item.region, item});
        }}
        isDisabled={serversLoading}
        isLoading={searchLoading}
        items={searchItems}
        className="flex-[2] w-full sm:w-[180px] sm:flex-none"
        radius="none"
        popoverProps={{
          radius: "none",
        }}
        listboxProps={commonListboxProps}
        inputProps={{
          classNames: {
            ...autocompleteInputClassNames,
            inputWrapper: autocompleteInputClassNames.inputWrapper + "!border-r-1",
          }
        }}
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
