from aion2.backend.schemas.base import StandardResponse, StandardListResponse, Empty
from aion2.backend.schemas.user import UserRead, UserCreate, UserUpdate
from aion2.backend.schemas.language import LanguageRead, LanguageCreate, LanguageUpdate
from aion2.backend.schemas.map import MapRead, MapReadDetail, MapCreate, MapUpdate, MapTranslationRead, \
    MapTranslationUpdate
from aion2.backend.schemas.category import CategoryRead, CategoryReadDetail, CategoryCreate, CategoryUpdate, \
    CategoryTranslationRead, CategoryTranslationUpdate, SubtypeReadDetail
from aion2.backend.schemas.subtype import SubtypeRead, SubtypeCreate, SubtypeUpdate, SubtypeTranslationRead, \
    SubtypeTranslationUpdate
from aion2.backend.schemas.region import RegionRead, RegionReadDetail, RegionCreate, RegionUpdate, \
    RegionTranslationRead, RegionTranslationUpdate
from aion2.backend.schemas.marker import MarkerRead, MarkerReadDetail, MarkerCreate, MarkerCreateReal, MarkerUpdate, \
    MarkerTranslationRead, MarkerTranslationUpdate, MarkerImageCreate, MarkerImageRead, MarkerImageReadDetail, \
    MarkerFeedbackRead, MarkerFeedbackUpdate, MarkerFeedbackType, MarkerFeedbackStatus, MarkerFeedbackReply
from aion2.backend.schemas.image import ImageRead, ImageCreate
from aion2.backend.schemas.auth import AltchaChallenge
from aion2.backend.schemas.user_marker_progress import UserMarkerProgressRead, UserMarkerProgressUpdateAll, \
    UserMarkerProgressUpdateBit
from aion2.backend.schemas.comment import CommentCreate, CommentRead, CommentTargetType, MarkerCommentRead
from aion2.backend.schemas.character import CharacterInfo, CharacterTitle, CharacterStat, CharacterDetailInfo, \
    CharacterBoard, CharacterProfile, CharacterRanking, CharacterEquipment, CharacterSkill, CharacterEquipments, \
    CharacterItem, CharacterItemSubStat, CharacterItemMainStat, CharacterItemMagicStoneStat, CharacterItemGodStoneStat, \
    CharacterDetail, CharacterJob, CharacterJobMeta, CharacterJobItem, CharacterItemSubSkill, CharacterSkin, \
    CharacterPet, CharacterWing, CharacterBoardDetail
from aion2.backend.schemas.season import SeasonRead, SeasonCreate, SeasonUpdate
from aion2.backend.schemas.server import ServerRead, ServerCreate, ServerUpdate, ServerMatchingRead, \
    ServerMatchingReadDetail, ServerMatchingCreate, ServerMatchingUpdate, ServerMatchingCreateInternal
from aion2.backend.schemas.abyss_artifact import AbyssArtifactRead, AbyssArtifactReadDetail, \
    AbyssArtifactCreate, AbyssArtifactUpdate, AbyssArtifactStateRead, \
    AbyssArtifactStateCreate, AbyssArtifactStateUpdate, AbyssArtifactServerCount, \
    AbyssArtifactStateInfo, AbyssArtifactVoteCreate, AbyssArtifactAdminRead, \
    AbyssArtifactAdminReadDetail, AbyssArtifactAdminCreate
