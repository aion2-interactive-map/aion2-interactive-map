"""Contains all the data models used in inputs/outputs"""

from .abyss_artifact_admin_read_detail import AbyssArtifactAdminReadDetail
from .abyss_artifact_admin_read_detail_list import AbyssArtifactAdminReadDetailList
from .abyss_artifact_admin_read_detail_list_resp import AbyssArtifactAdminReadDetailListResp
from .abyss_artifact_admin_read_detail_resp import AbyssArtifactAdminReadDetailResp
from .abyss_artifact_contributor_read import AbyssArtifactContributorRead
from .abyss_artifact_create import AbyssArtifactCreate
from .abyss_artifact_read_detail import AbyssArtifactReadDetail
from .abyss_artifact_read_detail_list import AbyssArtifactReadDetailList
from .abyss_artifact_read_detail_list_resp import AbyssArtifactReadDetailListResp
from .abyss_artifact_read_detail_resp import AbyssArtifactReadDetailResp
from .abyss_artifact_server_count import AbyssArtifactServerCount
from .abyss_artifact_server_count_list import AbyssArtifactServerCountList
from .abyss_artifact_server_count_list_resp import AbyssArtifactServerCountListResp
from .abyss_artifact_state_create import AbyssArtifactStateCreate
from .abyss_artifact_state_info import AbyssArtifactStateInfo
from .abyss_artifact_state_read import AbyssArtifactStateRead
from .abyss_artifact_state_read_list import AbyssArtifactStateReadList
from .abyss_artifact_state_read_list_resp import AbyssArtifactStateReadListResp
from .abyss_artifact_state_read_resp import AbyssArtifactStateReadResp
from .abyss_artifact_state_update import AbyssArtifactStateUpdate
from .abyss_artifact_update import AbyssArtifactUpdate
from .abyss_artifact_vote_create import AbyssArtifactVoteCreate
from .altcha_challenge import AltchaChallenge
from .altcha_challenge_algorithm import AltchaChallengeAlgorithm
from .altcha_challenge_resp import AltchaChallengeResp
from .bearer_response import BearerResponse
from .body_auth_cookie_login_api_v1_auth_cookie_login_post import BodyAuthCookieLoginApiV1AuthCookieLoginPost
from .body_auth_jwt_login_api_v1_auth_jwt_login_post import BodyAuthJwtLoginApiV1AuthJwtLoginPost
from .body_marker_feedback_create_marker_feedback_api_v1_maps_map_marker_feedbacks_post import (
    BodyMarkerFeedbackCreateMarkerFeedbackApiV1MapsMapMarkerFeedbacksPost,
)
from .body_marker_feedback_update_marker_feedback_api_v1_maps_map_marker_feedbacks_feedback_patch import (
    BodyMarkerFeedbackUpdateMarkerFeedbackApiV1MapsMapMarkerFeedbacksFeedbackPatch,
)
from .body_marker_images_upload_marker_image_api_v1_maps_map_markers_marker_images_put import (
    BodyMarkerImagesUploadMarkerImageApiV1MapsMapMarkersMarkerImagesPut,
)
from .body_reset_forgot_password_api_v1_auth_forgot_password_post import (
    BodyResetForgotPasswordApiV1AuthForgotPasswordPost,
)
from .body_reset_reset_password_api_v1_auth_reset_password_post import BodyResetResetPasswordApiV1AuthResetPasswordPost
from .body_verify_request_token_api_v1_auth_request_verify_token_post import (
    BodyVerifyRequestTokenApiV1AuthRequestVerifyTokenPost,
)
from .body_verify_verify_api_v1_auth_verify_post import BodyVerifyVerifyApiV1AuthVerifyPost
from .category_create import CategoryCreate
from .category_read import CategoryRead
from .category_read_detail import CategoryReadDetail
from .category_read_detail_list import CategoryReadDetailList
from .category_read_detail_list_resp import CategoryReadDetailListResp
from .category_read_detail_resp import CategoryReadDetailResp
from .category_translation_read import CategoryTranslationRead
from .category_translation_read_resp import CategoryTranslationReadResp
from .category_translation_update import CategoryTranslationUpdate
from .category_update import CategoryUpdate
from .character_info import CharacterInfo
from .character_info_list import CharacterInfoList
from .character_info_list_resp import CharacterInfoListResp
from .character_job import CharacterJob
from .character_job_items import CharacterJobItems
from .character_job_meta import CharacterJobMeta
from .character_job_resp import CharacterJobResp
from .comment_create import CommentCreate
from .comment_read import CommentRead
from .comment_read_list import CommentReadList
from .comment_read_list_resp import CommentReadListResp
from .comment_read_resp import CommentReadResp
from .comment_target_type import CommentTargetType
from .empty import Empty
from .empty_resp import EmptyResp
from .error_code import ErrorCode
from .error_model import ErrorModel
from .error_model_detail_type_1 import ErrorModelDetailType1
from .error_show_type import ErrorShowType
from .http_validation_error import HTTPValidationError
from .image_read import ImageRead
from .language_create import LanguageCreate
from .language_read import LanguageRead
from .language_read_list import LanguageReadList
from .language_read_list_resp import LanguageReadListResp
from .language_read_resp import LanguageReadResp
from .map_create import MapCreate
from .map_read import MapRead
from .map_read_detail import MapReadDetail
from .map_read_detail_list import MapReadDetailList
from .map_read_detail_list_resp import MapReadDetailListResp
from .map_read_detail_resp import MapReadDetailResp
from .map_translation_read import MapTranslationRead
from .map_translation_read_resp import MapTranslationReadResp
from .map_translation_update import MapTranslationUpdate
from .map_update import MapUpdate
from .marker_comment_read import MarkerCommentRead
from .marker_comment_read_list import MarkerCommentReadList
from .marker_comment_read_list_resp import MarkerCommentReadListResp
from .marker_create import MarkerCreate
from .marker_feedback_read import MarkerFeedbackRead
from .marker_feedback_read_list import MarkerFeedbackReadList
from .marker_feedback_read_list_resp import MarkerFeedbackReadListResp
from .marker_feedback_read_resp import MarkerFeedbackReadResp
from .marker_feedback_reply import MarkerFeedbackReply
from .marker_feedback_status import MarkerFeedbackStatus
from .marker_feedback_type import MarkerFeedbackType
from .marker_image_read import MarkerImageRead
from .marker_image_read_detail import MarkerImageReadDetail
from .marker_image_read_detail_list import MarkerImageReadDetailList
from .marker_image_read_detail_list_resp import MarkerImageReadDetailListResp
from .marker_image_read_detail_resp import MarkerImageReadDetailResp
from .marker_read import MarkerRead
from .marker_read_detail import MarkerReadDetail
from .marker_read_detail_list import MarkerReadDetailList
from .marker_read_detail_list_resp import MarkerReadDetailListResp
from .marker_read_detail_resp import MarkerReadDetailResp
from .marker_translation_read import MarkerTranslationRead
from .marker_translation_read_resp import MarkerTranslationReadResp
from .marker_translation_update import MarkerTranslationUpdate
from .marker_update import MarkerUpdate
from .region_create import RegionCreate
from .region_read import RegionRead
from .region_read_detail import RegionReadDetail
from .region_read_detail_list import RegionReadDetailList
from .region_read_detail_list_resp import RegionReadDetailListResp
from .region_read_detail_resp import RegionReadDetailResp
from .region_translation_read import RegionTranslationRead
from .region_translation_read_resp import RegionTranslationReadResp
from .region_translation_update import RegionTranslationUpdate
from .region_update import RegionUpdate
from .season_create import SeasonCreate
from .season_read import SeasonRead
from .season_read_list import SeasonReadList
from .season_read_list_resp import SeasonReadListResp
from .season_read_resp import SeasonReadResp
from .season_update import SeasonUpdate
from .server_create import ServerCreate
from .server_matching_create import ServerMatchingCreate
from .server_matching_read import ServerMatchingRead
from .server_matching_read_detail import ServerMatchingReadDetail
from .server_matching_read_detail_list import ServerMatchingReadDetailList
from .server_matching_read_detail_list_resp import ServerMatchingReadDetailListResp
from .server_matching_read_detail_resp import ServerMatchingReadDetailResp
from .server_matching_update import ServerMatchingUpdate
from .server_read import ServerRead
from .server_read_list import ServerReadList
from .server_read_list_resp import ServerReadListResp
from .server_read_resp import ServerReadResp
from .server_update import ServerUpdate
from .subtype_create import SubtypeCreate
from .subtype_read import SubtypeRead
from .subtype_read_detail import SubtypeReadDetail
from .subtype_read_detail_list import SubtypeReadDetailList
from .subtype_read_detail_list_resp import SubtypeReadDetailListResp
from .subtype_read_detail_resp import SubtypeReadDetailResp
from .subtype_translation_read import SubtypeTranslationRead
from .subtype_translation_read_resp import SubtypeTranslationReadResp
from .subtype_translation_update import SubtypeTranslationUpdate
from .subtype_update import SubtypeUpdate
from .user_create import UserCreate
from .user_marker_progress_read import UserMarkerProgressRead
from .user_marker_progress_read_list import UserMarkerProgressReadList
from .user_marker_progress_read_list_resp import UserMarkerProgressReadListResp
from .user_marker_progress_read_resp import UserMarkerProgressReadResp
from .user_marker_progress_update_all import UserMarkerProgressUpdateAll
from .user_marker_progress_update_bit import UserMarkerProgressUpdateBit
from .user_read import UserRead
from .user_read_list import UserReadList
from .user_read_list_resp import UserReadListResp
from .user_read_resp import UserReadResp
from .user_update import UserUpdate
from .validation_error import ValidationError

__all__ = (
    "AbyssArtifactAdminReadDetail",
    "AbyssArtifactAdminReadDetailList",
    "AbyssArtifactAdminReadDetailListResp",
    "AbyssArtifactAdminReadDetailResp",
    "AbyssArtifactContributorRead",
    "AbyssArtifactCreate",
    "AbyssArtifactReadDetail",
    "AbyssArtifactReadDetailList",
    "AbyssArtifactReadDetailListResp",
    "AbyssArtifactReadDetailResp",
    "AbyssArtifactServerCount",
    "AbyssArtifactServerCountList",
    "AbyssArtifactServerCountListResp",
    "AbyssArtifactStateCreate",
    "AbyssArtifactStateInfo",
    "AbyssArtifactStateRead",
    "AbyssArtifactStateReadList",
    "AbyssArtifactStateReadListResp",
    "AbyssArtifactStateReadResp",
    "AbyssArtifactStateUpdate",
    "AbyssArtifactUpdate",
    "AbyssArtifactVoteCreate",
    "AltchaChallenge",
    "AltchaChallengeAlgorithm",
    "AltchaChallengeResp",
    "BearerResponse",
    "BodyAuthCookieLoginApiV1AuthCookieLoginPost",
    "BodyAuthJwtLoginApiV1AuthJwtLoginPost",
    "BodyMarkerFeedbackCreateMarkerFeedbackApiV1MapsMapMarkerFeedbacksPost",
    "BodyMarkerFeedbackUpdateMarkerFeedbackApiV1MapsMapMarkerFeedbacksFeedbackPatch",
    "BodyMarkerImagesUploadMarkerImageApiV1MapsMapMarkersMarkerImagesPut",
    "BodyResetForgotPasswordApiV1AuthForgotPasswordPost",
    "BodyResetResetPasswordApiV1AuthResetPasswordPost",
    "BodyVerifyRequestTokenApiV1AuthRequestVerifyTokenPost",
    "BodyVerifyVerifyApiV1AuthVerifyPost",
    "CategoryCreate",
    "CategoryRead",
    "CategoryReadDetail",
    "CategoryReadDetailList",
    "CategoryReadDetailListResp",
    "CategoryReadDetailResp",
    "CategoryTranslationRead",
    "CategoryTranslationReadResp",
    "CategoryTranslationUpdate",
    "CategoryUpdate",
    "CharacterInfo",
    "CharacterInfoList",
    "CharacterInfoListResp",
    "CharacterJob",
    "CharacterJobItems",
    "CharacterJobMeta",
    "CharacterJobResp",
    "CommentCreate",
    "CommentRead",
    "CommentReadList",
    "CommentReadListResp",
    "CommentReadResp",
    "CommentTargetType",
    "Empty",
    "EmptyResp",
    "ErrorCode",
    "ErrorModel",
    "ErrorModelDetailType1",
    "ErrorShowType",
    "HTTPValidationError",
    "ImageRead",
    "LanguageCreate",
    "LanguageRead",
    "LanguageReadList",
    "LanguageReadListResp",
    "LanguageReadResp",
    "MapCreate",
    "MapRead",
    "MapReadDetail",
    "MapReadDetailList",
    "MapReadDetailListResp",
    "MapReadDetailResp",
    "MapTranslationRead",
    "MapTranslationReadResp",
    "MapTranslationUpdate",
    "MapUpdate",
    "MarkerCommentRead",
    "MarkerCommentReadList",
    "MarkerCommentReadListResp",
    "MarkerCreate",
    "MarkerFeedbackRead",
    "MarkerFeedbackReadList",
    "MarkerFeedbackReadListResp",
    "MarkerFeedbackReadResp",
    "MarkerFeedbackReply",
    "MarkerFeedbackStatus",
    "MarkerFeedbackType",
    "MarkerImageRead",
    "MarkerImageReadDetail",
    "MarkerImageReadDetailList",
    "MarkerImageReadDetailListResp",
    "MarkerImageReadDetailResp",
    "MarkerRead",
    "MarkerReadDetail",
    "MarkerReadDetailList",
    "MarkerReadDetailListResp",
    "MarkerReadDetailResp",
    "MarkerTranslationRead",
    "MarkerTranslationReadResp",
    "MarkerTranslationUpdate",
    "MarkerUpdate",
    "RegionCreate",
    "RegionRead",
    "RegionReadDetail",
    "RegionReadDetailList",
    "RegionReadDetailListResp",
    "RegionReadDetailResp",
    "RegionTranslationRead",
    "RegionTranslationReadResp",
    "RegionTranslationUpdate",
    "RegionUpdate",
    "SeasonCreate",
    "SeasonRead",
    "SeasonReadList",
    "SeasonReadListResp",
    "SeasonReadResp",
    "SeasonUpdate",
    "ServerCreate",
    "ServerMatchingCreate",
    "ServerMatchingRead",
    "ServerMatchingReadDetail",
    "ServerMatchingReadDetailList",
    "ServerMatchingReadDetailListResp",
    "ServerMatchingReadDetailResp",
    "ServerMatchingUpdate",
    "ServerRead",
    "ServerReadList",
    "ServerReadListResp",
    "ServerReadResp",
    "ServerUpdate",
    "SubtypeCreate",
    "SubtypeRead",
    "SubtypeReadDetail",
    "SubtypeReadDetailList",
    "SubtypeReadDetailListResp",
    "SubtypeReadDetailResp",
    "SubtypeTranslationRead",
    "SubtypeTranslationReadResp",
    "SubtypeTranslationUpdate",
    "SubtypeUpdate",
    "UserCreate",
    "UserMarkerProgressRead",
    "UserMarkerProgressReadList",
    "UserMarkerProgressReadListResp",
    "UserMarkerProgressReadResp",
    "UserMarkerProgressUpdateAll",
    "UserMarkerProgressUpdateBit",
    "UserRead",
    "UserReadList",
    "UserReadListResp",
    "UserReadResp",
    "UserUpdate",
    "ValidationError",
)
