export type CharacterInfo = {
  profile: CharacterProfile;
  stats: CharacterStat[];
  titles: CharacterTitle[];
  rankings: CharacterRanking[];
  boards: CharacterBoard[];
  skills: CharacterSkill[];
  equipments: CharacterEquipment[];
  updatedAt: string;
};

export type CharacterProfile = {
  characterId: string;
  characterName: string;
  serverId: number;
  serverName: string;
  regionName: string;
  pcId: number;
  className: string;
  raceId: 1 | 2;
  raceName: string;
  gender: number;
  genderName: string;
  characterLevel: number;
  titleId: number;
  titleName: string;
  titleGrade: string;
  profileImage: string;
};

export type CharacterStatType =
  | "STR"
  | "DEX"
  | "INT"
  | "CON"
  | "AGI"
  | "WIS"
  | "Justice"
  | "Freedom"
  | "Illusion"
  | "Life"
  | "Time"
  | "Destruction"
  | "Death"
  | "Wisdom"
  | "Destiny"
  | "Space"
  | "ItemLevel"
  | (string & {}); // allow backend to add more types safely

export type CharacterStat = {
  type: CharacterStatType;
  value: number;
};

export type CharacterTitle = {
  id: number;
  equipCategory: string;
  name: string;
  grade: string;
  totalCount: number;
  ownedCount: number;
};

export type CharacterRanking = {
  rankingContentsType: number | null;
  rankingContentsName: string | null;
  rankingType: number | null;
  rank: number | null;

  characterId: string | null;
  characterName: string | null;

  classId: number | null;
  className: string | null;
  guildName: string | null;

  point: number | null;
  prevRank: number | null;
  rankChange: number | null;

  gradeId: number | null;
  gradeName: string | null;
  gradeIcon: string | null;

  profileImage: string | null;

  extraDataMap: Record<string, unknown> | null;
};

export type CharacterBoard = {
  id: number;
  name: string;
  totalNodeCount: number;
  openNodeCount: number;
  icon: string;
  open: number;
};

export type CharacterSkill = {
  id: number;
  skillLevel: number;
  acquired: 0 | 1;
  equip: 0 | 1;
};

export type CharacterEquipment = {
  id: number;
  enchantLevel: number;
  exceedLevel: number;
  slotPos: number;
};
