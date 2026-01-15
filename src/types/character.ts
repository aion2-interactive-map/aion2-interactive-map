export type CharacterInfo = {
  profile: CharacterProfile;
  stats: CharacterStat[];
  titles: CharacterTitle[];
  rankings: CharacterRanking[];
  boards: CharacterBoard[];
  updatedAt: string;
};

export type CharacterEquipments = {
  skills: CharacterSkill[];
  equipments: CharacterEquipment[];
  skins: CharacterSkin[];
  pet: CharacterPet | null;
  wing: CharacterWing | null;
};

export type CharacterSkin = {
  id: number;
  name: string;
  grade: string;
  slotPos: number;
  slotPosName: string;
  icon: string;
};

export type CharacterPet = {
  id: number;
  name: string;
  level: number;
  icon: string;
};

export type CharacterWing = {
  id: number;
  name: string;
  grade: string;
  icon: string;
};

export type CharacterEquipmentDetails = Record<string, CharacterEquipmentDetail>;

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
  stats: string[];
  equipStats: string[];
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
  slotPosName: string;
};

export type CharacterEquipmentDetail = {
  id: number;
  level: number;
  levelValue: number;
  enchantLevel: number;
  maxEnchantLevel: number;
  maxExceedEnchantLevel: number;
  soulBindRate: string;
  mainStats: CharacterEquipmentStat[];
  subStats: CharacterEquipmentSubStat[];
  subSkills: CharacterEquipmentSubSkill[];
  magicStoneStat: MagicStoneStat[];
  godStoneStat: GodStoneStat[];
};

export type CharacterEquipmentSubSkill = {
  id: number;
  level: number;
};

export type CharacterEquipmentStat = {
  id: string;
  minValue: string;
  value: string;
  extra: string;
  exceed: boolean;
};

export type CharacterEquipmentSubStat = {
  id: string;
  value: string;
};

export type MagicStoneStat = {
  id: string;
  value: string;
  grade: string;
  slotPos: number;
};

export type GodStoneStat = {
  icon: string;
  name: string;
  desc: string;
  grade: string;
  slotPos: number;
};
