from datetime import datetime
from uuid import UUID
from typing import Optional, List, Any

from pydantic import Field

from aion2.backend.schemas.base import BaseModel
from aion2.backend.schemas.language import LanguageRead


# Map Schemas

class CharacterInfo(BaseModel):
    id: str
    name: str
    race: int
    pc_id: int
    level: int
    server_id: int
    server_name: str
    profile_image_url: str


class CharacterStat(BaseModel):
    type: str
    value: int


class CharacterTitle(BaseModel):
    id: int | None
    equip_category: str
    name: str | None
    grade: str | None
    total_count: int
    owned_count: int
    stats: List[str] = Field(default_factory=list)
    equip_stats: List[str] = Field(default_factory=list)


class CharacterProfile(BaseModel):
    character_id: str = Field(..., description="Unique encoded character ID")
    character_name: str = Field(..., description="Character name")
    server_id: int = Field(..., description="Game server ID")
    server_name: str = Field(..., description="Server display name")
    region_name: str = Field(..., description="Community or region name")
    pc_id: int = Field(..., description="Platform or player category ID")
    class_name: str = Field(..., description="Class name")
    race_id: int = Field(..., description="Race ID")
    race_name: str = Field(..., description="Race name")
    gender: int = Field(..., description="Gender ID")
    gender_name: str = Field(..., description="Gender display name")
    character_level: int = Field(..., description="Character level")
    title_id: int = Field(..., description="Title ID")
    title_name: str = Field(..., description="Title name")
    title_grade: str = Field(..., description="Title grade or rarity")
    profile_image: str = Field(..., description="Profile image URL")


class CharacterRanking(BaseModel):
    ranking_contents_type: int | None = Field(None, description="Ranking contents category type")
    ranking_contents_name: str | None = Field(None, description="Ranking contents name")
    ranking_type: int | None = Field(None, description="Ranking type ID")
    rank: int | None = Field(None, description="Current rank")
    character_id: str | None = Field(None, description="Character ID")
    character_name: str | None = Field(None, description="Character name")
    class_id: int | None = Field(None, description="Class ID")
    class_name: str | None = Field(None, description="Class name")
    guild_name: str | None = Field(None, description="Guild name")
    point: int | None = Field(None, description="Ranking points")
    prev_rank: int | None = Field(None, description="Previous rank")
    rank_change: int | None = Field(None, description="Rank change delta")
    grade_id: int | None = Field(None, description="Grade ID")
    grade_name: str | None = Field(None, description="Grade name")
    grade_icon: str | None = Field(None, description="Grade icon URL")
    profile_image: str | None = Field(None, description="Profile image URL")
    extra_data_map: dict[str, Any] | None = Field(None, description="Extra data map")


class CharacterBoard(BaseModel):
    id: int = Field(..., description="Board ID")
    name: str = Field(..., description="Display name")
    total_node_count: int = Field(..., description="Total node count")
    open_node_count: int = Field(..., description="Open/active node count")
    icon: str = Field(..., description="Icon URL")
    open: int = Field(..., description="Open status flag")


class CharacterSkill(BaseModel):
    id: int = Field(..., description="Skill ID")
    skillLevel: int = Field(..., description="Skill level")
    acquired: int = Field(..., description="Acquired")
    equip: int = Field(..., description="Equip")


class CharacterEquipment(BaseModel):
    id: int = Field(..., description="Equipment ID")
    enchant_level: int = Field(..., description="Enchant level")
    exceed_level: int = Field(..., description="Exceed level")
    slot_pos: int = Field(..., description="Slot position")
    slot_pos_name: str = Field(..., description="Slot name")


class CharacterSkin(BaseModel):
    id: int = Field(..., description="Skin ID")
    name: str = Field(..., description="Skin name")
    grade: str = Field(..., description="Skin grade")
    slot_pos: int = Field(..., description="Slot position")
    slot_pos_name: str = Field(..., description="Slot name")
    icon: str = Field(..., description="Skin icon URL")


class CharacterPet(BaseModel):
    id: int | None = Field(default=None, description="Pet ID")
    name: str | None = Field(default=None, description="Pet name")
    level: int | None = Field(default=None, description="Pet level")
    icon: str | None = Field(default=None, description="Pet icon URL")


class CharacterWing(BaseModel):
    id: int | None = Field(default=None, description="Wing ID")
    name: str | None = Field(default=None, description="Wing name")
    grade: str | None = Field(default=None, description="Wing grade")
    icon: str | None = Field(default=None, description="Wing icon URL")


class CharacterDetailInfo(BaseModel):
    profile: CharacterProfile
    stats: list[CharacterStat]
    titles: list[CharacterTitle]
    rankings: list[CharacterRanking]
    boards: list[CharacterBoard]


class CharacterEquipments(BaseModel):
    skills: list[CharacterSkill]
    equipments: list[CharacterEquipment]
    skins: list[CharacterSkin]
    pet: CharacterPet
    wing: CharacterWing


class CharacterDetail(CharacterDetailInfo, CharacterEquipments):
    updated_at: datetime = Field(..., description="Updated at")


class CharacterItemMainStat(BaseModel):
    id: str = Field(..., description="Stat ID")
    min_value: str = Field("", description="Min value")
    value: str = Field(..., description="Stat value")
    extra: str = Field("", description="Extra data")
    exceed: bool = Field(False, description="Exceed")


class CharacterItemSubStat(BaseModel):
    id: str = Field(..., description="Stat ID")
    value: str = Field(..., description="Stat value")


class CharacterItemSubSkill(BaseModel):
    id: int = Field(..., description="Skill ID")
    level: int = Field(..., description="Level")


class CharacterItemMagicStoneStat(BaseModel):
    id: str = Field(..., description="Stat ID")
    value: str = Field(..., description="Stat value")
    grade: str = Field(..., description="Stat grade")
    slot_pos: int = Field(..., description="Slot position")


class CharacterItemGodStoneStat(BaseModel):
    icon: str = Field(..., description="Icon URL")
    name: str = Field(..., description="Name")
    desc: str = Field(..., description="Description")
    grade: str = Field(..., description="Grade")
    slot_pos: int = Field(..., description="Slot position")


class CharacterItem(BaseModel):
    id: int = Field(..., description="Item ID")
    level: int = Field(..., description="Item level")
    level_value: int = Field(..., description="Item extra level")
    enchant_level: int = Field(..., description="Item enchant level")
    max_enchant_level: int = Field(..., description="Item max enchant level")
    max_exceed_enchant_level: int = Field(default=0, description="Item max exceed enchant level")
    soul_bind_rate: str = Field(..., description="Soul bind rate")
    main_stats: list[CharacterItemMainStat] = Field(default_factory=list, description="Main stats")
    sub_stats: list[CharacterItemSubStat] = Field(default_factory=list, description="Sub stats")
    sub_skills: list[CharacterItemSubSkill] = Field(default_factory=list, description="Sub skills")
    magic_stone_stat: list[CharacterItemMagicStoneStat] = Field(default_factory=list, description="Magic stone stat")
    god_stone_stat: list[CharacterItemGodStoneStat] = Field(default=list, description="god stone stat")


class CharacterBoardDetail(BaseModel):
    board_id: int = Field(..., description="Board ID")
    open_nodes: List[int] = Field(default_factory=list, description="Nodes open")


class CharacterJobMeta(BaseModel):
    job_id: str = Field(..., description="Job ID")
    status: str = Field(..., description="Job status")
    started_at: float | None = Field(default=None, description="Updated at")
    updated_at: float = Field(..., description="Updated at")
    done: int = Field(default=0, description="Done")
    failed: int = Field(default=0, description="Failed")
    total: int = Field(default=0, description="Total")


class CharacterJobItem(BaseModel):
    type: str = Field(..., description="Job item type")
    # data: CharacterDetailInfo | CharacterEquipments | CharacterItem = Field(..., description="Job item data")
    data: dict = Field(..., description="Job item data")


class CharacterJob(BaseModel):
    job_id: str | None = Field(None, description="Job ID")
    status: str = Field(..., description="Job status")
    meta: CharacterJobMeta = Field(..., description="Job meta data")
    items: dict = Field({}, description="Job items")
