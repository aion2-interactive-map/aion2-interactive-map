import asyncio
import hashlib
from io import BytesIO
from typing import Any, Sequence, BinaryIO
from uuid import UUID

from aiobotocore.client import AioBaseClient
from botocore.exceptions import ClientError
from fastapi_utils.cbv import cbv
from fastcrud import FastCRUD
from fastapi import APIRouter, Depends, Body, UploadFile, File, Form, FastAPI, Query, Path
from sqlalchemy import select, func, delete, update, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from aion2.backend import models, schemas
from aion2.backend.config.manager import settings
from aion2.backend.interfaces.cache import clear_cache
from aion2.backend.utilities.bitset import ensure_bitset_size, set_bit
from aion2.backend.utilities.dependencies import get_db, get_current_superuser, get_current_user, \
    get_category_from_path, \
    get_category_from_path, get_language_from_path, get_map_from_path, get_subtype_from_path, get_marker_from_path, \
    get_region_from_path, s3_client_upload_dependency
from aion2.backend.utilities.exceptions import BizError, ErrorCode
from aion2.backend.utilities.image import process_image, load_normalized_image, make_full_image, sha256_base64url

router = APIRouter(prefix="/maps/{map}", tags=["markers"])

marker_crud = FastCRUD(models.Marker)
marker_translation_crud = FastCRUD(models.MarkerTranslation)
marker_feedback_crud = FastCRUD(models.MarkerFeedback)
marker_comment_crud = FastCRUD(models.MarkerComment)
marker_image_crud = FastCRUD(models.MarkerImage)
image_crud = FastCRUD(models.Image)


async def update_marker_contributor(db: AsyncSession, marker_id: UUID, user_id: UUID):
    result = await db.execute(
        select(models.MarkerContributor).
        where(models.MarkerContributor.marker_id == marker_id).
        where(models.MarkerContributor.user_id == user_id)
    )
    marker_contribution = result.unique().scalar_one_or_none()
    if marker_contribution is None:
        marker_contribution = models.MarkerContributor(marker_id=marker_id, user_id=user_id)
        db.add(marker_contribution)
        await db.commit()


async def get_next_index_for_subtype(db: AsyncSession, map_id: UUID, subtype_id: UUID | None) -> int | None:
    if subtype_id is None:
        return None
    stmt = (
        select(
            func.coalesce(func.max(models.Marker.index_in_subtype), -1) + 1
        )
        .where(
            models.Marker.map_id == map_id,
            models.Marker.subtype_id == subtype_id,
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one()


async def db_list_marker_images(db: AsyncSession, marker_id: UUID):
    result = await db.execute(
        select(models.MarkerImage).
        where(models.MarkerImage.marker_id == marker_id).
        order_by(models.MarkerImage.order)
    )
    return result.unique().scalars().all()


async def upload_image(db: AsyncSession, s3_client: AioBaseClient, marker_id: UUID, data: BinaryIO):
    image_data = await asyncio.to_thread(process_image, data)
    s3_key = f"markers_images/{image_data['digest']}"
    try:
        for size in ("full", "normal", "small"):
            await s3_client.put_object(
                Bucket=settings.S3_BUCKET,
                Key=f"{s3_key}.{size}.webp",
                Body=image_data[size],
                ContentType="image/webp",
            )

    except ClientError as e:
        raise BizError(ErrorCode.S3UploadError, str(e))

    # create image in db
    result = await db.execute(
        select(models.Image).
        where(models.Image.s3_key == s3_key)
    )
    image_model = result.unique().scalar_one_or_none()
    if image_model is None:
        image_data = schemas.ImageCreate(
            s3_key=s3_key,
            height=image_data["height"],
            width=image_data["width"],
        )
        image_model = await image_crud.create(db, image_data)

    # create marker model in db
    marker_image_models = await db_list_marker_images(db, marker_id)
    marker_image_model = None
    for x in marker_image_models:
        if x.image_id == image_model.id:
            marker_image_model = x
            break
    if marker_image_model is None:
        marker_image_data = schemas.MarkerImageCreate(
            marker_id=marker_id,
            image_id=image_model.id,
            order=len(marker_image_models),
        )
        marker_image_model = await marker_image_crud.create(db, marker_image_data)
    return marker_image_model


@cbv(router)
class Markers:
    user: models.User = Depends(get_current_superuser)
    map_model: models.Map = Depends(get_map_from_path)
    db: AsyncSession = Depends(get_db)

    async def check_subtype_id(self, subtype_id: str | UUID | None) -> UUID | None:
        if subtype_id is None:
            return None
        try:
            subtype_model = await get_subtype_from_path(subtype_id, self.db)
            return subtype_model.id
        except:
            raise BizError(ErrorCode.SubTypeNotFoundError)

    async def check_region_id(self, region_id: str | UUID | None) -> UUID | None:
        if not region_id:
            return None
        try:
            region_model = await get_region_from_path(region_id, self.db)
            return region_model.id
        except:
            raise BizError(ErrorCode.RegionNotFoundError)

    @router.post("/markers")
    async def create_marker(
            self,
            marker_data: schemas.MarkerCreate,
    ) -> schemas.StandardResponse[schemas.MarkerReadDetail]:
        subtype_id = await self.check_subtype_id(marker_data.subtype_id)
        if marker_data.index_in_subtype is None:
            index_in_subtype = await get_next_index_for_subtype(self.db, self.map_model.id, subtype_id)
        else:
            index_in_subtype = marker_data.index_in_subtype
        region_id = await self.check_region_id(marker_data.region_id)
        real_marker_data = schemas.MarkerCreateReal(
            **marker_data.model_dump(exclude={"subtype_id", "region_id", "index_in_subtype"}),
            subtype_id=subtype_id,
            region_id=region_id,
            map_id=self.map_model.id,
            index_in_subtype=index_in_subtype,
        )
        marker_model = await marker_crud.create(self.db, real_marker_data)
        await update_marker_contributor(self.db, marker_model.id, self.user.id)
        await clear_cache(f"data:markers:{self.map_model.name}")
        return schemas.MarkerReadDetail.model_validate(marker_model).to_response()

    @router.get("/markers")
    async def list_markers(
            self,
            limit: int = Query(100),
            offset: int = Query(0),
            subtype: str = Query(""),
            region: str = Query(""),
            name: str = Query(""),
            x: int | None = Query(None),
            y: int | None = Query(None),
    ) -> schemas.StandardListResponse[schemas.MarkerReadDetail]:
        if subtype:
            subtype_model = await get_subtype_from_path(subtype, self.db)
        else:
            subtype_model = None
        if region:
            region_model = await get_region_from_path(region, self.db)
        else:
            region_model = None

        filter_dict: dict[str, Any] = {"map_id": self.map_model.id}
        query = select(models.Marker).where(models.Marker.map_id == self.map_model.id)
        if subtype_model is not None:
            query = query.where(models.Marker.subtype_id == subtype_model.id)
            filter_dict["subtype_id"] = subtype_model.id
        if region_model is not None:
            query = query.where(models.Marker.region_id == region_model.id)
            filter_dict["region_id"] = region_model.id
        if name:
            query = query.where(models.Marker.name.contains(name))
            filter_dict["name__contains"] = name
        if x is not None:
            query = query.where(models.Marker.x == x)
            filter_dict["x"] = x
        if y is not None:
            query = query.where(models.Marker.y == y)
            filter_dict["y"] = y

        query = query.limit(limit).offset(offset)

        count = await marker_crud.count(self.db, **filter_dict)
        result = await self.db.execute(query)
        markers = [schemas.MarkerReadDetail.model_validate(x) for x in result.unique().scalars()]
        return schemas.StandardListResponse(markers, count)

    @router.get("/markers/{marker}")
    async def get_marker(
            self,
            marker_model: models.Marker = Depends(get_marker_from_path)
    ) -> schemas.StandardResponse[schemas.MarkerReadDetail]:
        if marker_model.map_id != self.map_model.id:
            raise BizError(ErrorCode.MarkerNotFoundError)
        return schemas.MarkerReadDetail.model_validate(marker_model).to_response()

    @router.patch("/markers/{marker}")
    async def update_marker(
            self,
            marker_data: schemas.MarkerUpdate,
            marker_model: models.Marker = Depends(get_marker_from_path)
    ) -> schemas.StandardResponse[schemas.MarkerReadDetail]:
        if marker_model.map_id != self.map_model.id:
            raise BizError(ErrorCode.MarkerNotFoundError)
        subtype_id = await self.check_subtype_id(marker_data.subtype_id)
        region_id = await self.check_region_id(marker_data.region_id)
        update_dict: dict[str, Any] = {
            **marker_data.model_dump(exclude={"subtype_id", "region_id", "index_in_subtype"}),
            "subtype_id": subtype_id,
            "region_id": region_id,
        }
        if marker_model.index_in_subtype is not None:
            update_dict["index_in_subtype"] = marker_model.index_in_subtype
        elif subtype_id != marker_model.subtype_id:
            update_dict["index_in_subtype"] = await get_next_index_for_subtype(self.db, self.map_model.id, subtype_id)
        await marker_crud.update(
            self.db, update_dict, id=marker_model.id,
        )
        await self.db.refresh(marker_model)
        await update_marker_contributor(self.db, marker_model.id, self.user.id)
        await clear_cache(f"data:markers:{self.map_model.name}")
        return schemas.MarkerReadDetail.model_validate(marker_model).to_response()

    @router.delete("/markers/{marker}")
    async def delete_marker(
            self,
            marker_model: models.Marker = Depends(get_marker_from_path)
    ) -> schemas.StandardResponse[schemas.Empty]:
        if marker_model.map_id != self.map_model.id:
            raise BizError(ErrorCode.MarkerNotFoundError)
        await self.db.delete(marker_model)
        await self.db.commit()
        await clear_cache(f"data:markers:{self.map_model.name}")
        return schemas.StandardResponse()


@cbv(router)
class UserMarkerProgress:
    user: models.User = Depends(get_current_user)
    map_model: models.Marker = Depends(get_map_from_path)
    db: AsyncSession = Depends(get_db)

    @router.get("/marker_progress")
    async def list_user_marker_progress(
            self,
    ) -> schemas.StandardListResponse[schemas.UserMarkerProgressRead]:
        stmt = (
            select(models.UserMarkerProgress).
            where(models.UserMarkerProgress.user_id == self.user.id).
            where(models.UserMarkerProgress.map_id == self.map_model.id)
        )
        result = await self.db.execute(stmt)
        # user_marker_progress_models = result.scalars().all()
        user_marker_progress_models = [
            schemas.UserMarkerProgressRead.model_validate(x)
            for x in result.scalars()
        ]
        return schemas.StandardListResponse(user_marker_progress_models)

    @router.put("/markers/{marker}/progress")
    async def update_user_marker_progress_by_marker(
            self,
            marker_data: schemas.UserMarkerProgressUpdateBit,
            marker_model: models.Marker = Depends(get_marker_from_path),
    ) -> schemas.StandardResponse[schemas.Empty]:
        if marker_model.map_id != self.map_model.id:
            raise BizError(ErrorCode.MarkerNotFoundError)
        if marker_model.subtype_id is None or marker_model.subtype.can_complete is False:
            raise BizError(ErrorCode.SubTypeNotFoundError)
        stmt = (
            select(models.UserMarkerProgress)
            .where(
                models.UserMarkerProgress.user_id == self.user.id,
                models.UserMarkerProgress.map_id == self.map_model.id,
                models.UserMarkerProgress.subtype_id == marker_model.subtype_id,
            )
            .with_for_update()  # optional, protects against concurrent updates
        )
        res = await self.db.execute(stmt)
        progress_model = res.unique().scalar_one_or_none()
        required_bits = marker_model.index_in_subtype + 1
        if progress_model is None:
            bitset = ensure_bitset_size(None, required_bits)
            progress_model = models.UserMarkerProgress(
                user_id=self.user.id,
                map_id=self.map_model.id,
                subtype_id=marker_model.subtype_id,
                bitset=bitset,
            )
            self.db.add(progress_model)
            await self.db.flush()
        else:
            progress_model.bitset = ensure_bitset_size(progress_model.bitset, required_bits)
        progress_model.bitset = set_bit(progress_model.bitset, marker_model.index_in_subtype, marker_data.completed)
        await self.db.commit()
        return schemas.StandardResponse()

    @router.put("/subtypes/{subtype}/progress")
    async def update_user_marker_progress_by_subtype(
            self,
            subtype_data: schemas.UserMarkerProgressUpdateAll,
            subtype_model: models.Subtype = Depends(get_subtype_from_path),
    ) -> schemas.StandardResponse[schemas.UserMarkerProgressRead]:
        max_idx_stmt = (
            select(func.max(models.Marker.index_in_subtype))
            .where(
                models.Marker.map_id == self.map_model.id,
                models.Marker.subtype_id == subtype_model.id,
            )
        )
        max_idx_res = await self.db.execute(max_idx_stmt)
        max_index = max_idx_res.scalar_one()
        if max_index is None:
            raise BizError(ErrorCode.SubTypeNotFoundError)
        max_count = max_index + 1
        incoming_bit_count = len(subtype_data.bitset) * 8
        if incoming_bit_count > max_count:
            raise BizError(ErrorCode.BitSetTooLongError)

        stmt = (
            select(models.UserMarkerProgress)
            .where(
                models.UserMarkerProgress.user_id == self.user.id,
                models.UserMarkerProgress.map_id == self.map_model.id,
                models.UserMarkerProgress.subtype_id == subtype_model.id,
            )
        )
        res = await self.db.execute(stmt)
        progress_model = res.unique().scalar_one_or_none()

        if progress_model is None:
            progress_model = models.UserMarkerProgress(
                user_id=self.user.id,
                map_id=self.map_model.id,
                subtype_id=subtype_model.id,
                bitset=subtype_data.bitset,
            )
            self.db.add(progress_model)
        else:
            progress_model.bitset = subtype_data.bitset
        await self.db.commit()
        await self.db.refresh(progress_model)
        return schemas.UserMarkerProgressRead.model_validate(progress_model).to_response()


@cbv(router)
class MarkerImages:
    user: models.User = Depends(get_current_superuser)
    map_model: models.Map = Depends(get_map_from_path)
    db: AsyncSession = Depends(get_db)

    async def db_count_marker_images_by_image_id(self, image_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count()).
            select_from(models.MarkerImage).
            where(models.MarkerImage.image_id == image_id)
        )
        return result.scalar()

    @router.get("/markers/{marker}/images")
    async def list_marker_images(
            self,
            marker_model: models.Marker = Depends(get_marker_from_path),
    ) -> schemas.StandardListResponse[schemas.MarkerImageReadDetail]:
        if marker_model.map_id != self.map_model.id:
            raise BizError(ErrorCode.MarkerNotFoundError)
        marker_image_models = await db_list_marker_images(self.db, marker_model.id)
        marker_images = [schemas.MarkerImageReadDetail.model_validate(x) for x in marker_image_models]
        return schemas.StandardListResponse(marker_images)

    @router.put("/markers/{marker}/images")
    async def upload_marker_image(
            self,
            marker_model: models.Marker = Depends(get_marker_from_path),
            file: UploadFile = File(...),
            s3_client: AioBaseClient = Depends(s3_client_upload_dependency),
    ) -> schemas.StandardResponse[schemas.MarkerImageReadDetail]:
        if marker_model.map_id != self.map_model.id:
            raise BizError(ErrorCode.MarkerNotFoundError)
        marker_image_model = await upload_image(self.db, s3_client, marker_model.id, file.file)
        await update_marker_contributor(self.db, marker_model.id, self.user.id)
        await clear_cache(f"data:markers:{self.map_model.name}")
        return schemas.MarkerImageReadDetail.model_validate(marker_image_model).to_response()

    @router.delete("/markers/{marker}/images/{image}")
    async def delete_marker_image(
            self,
            marker_model: models.Marker = Depends(get_marker_from_path),
            marker_image_id: UUID = Path(..., alias="image"),
            s3_client: AioBaseClient = Depends(s3_client_upload_dependency)
    ) -> schemas.StandardResponse[schemas.Empty]:
        # find the marker_image
        marker_image: models.MarkerImage = await self.db.scalar(
            select(models.MarkerImage).where(
                models.MarkerImage.marker_id == marker_model.id,
                models.MarkerImage.id == marker_image_id,
            )
        )
        if marker_image is None:
            raise BizError(ErrorCode.MarkerImageNotFoundError)

        # delete the marker_image
        order = marker_image.order
        image_id = marker_image.image_id
        image_s3_key = marker_image.image.s3_key
        await self.db.delete(marker_image)

        # shift down orders for all later images of the same marker
        await self.db.execute(
            update(models.MarkerImage)
            .where(
                models.MarkerImage.marker_id == marker_model.id,
                models.MarkerImage.order > order,
            )
            .values(order=models.MarkerImage.order - 1)
        )
        await self.db.commit()

        # delete the image if no other marker_image uses this image
        count = await self.db.scalar(
            select(func.count())
            .select_from(models.MarkerImage)
            .where(models.MarkerImage.image_id == image_id)
        )
        if count == 0:
            await self.db.execute(
                delete(models.Image).where(models.Image.id == image_id)
            )
            try:
                for size in ("full", "normal", "small"):
                    await s3_client.delete_object(
                        Bucket=settings.S3_BUCKET,
                        Key=f"{image_s3_key}.{size}.webp",
                    )
            except ClientError as e:
                raise BizError(ErrorCode.S3UploadError, str(e))
            await self.db.commit()
        await clear_cache(f"data:markers:{self.map_model.name}")
        return schemas.StandardResponse()


@cbv(router)
class MarkerComment:
    user: models.User = Depends(get_current_user)
    map_model: models.Map = Depends(get_map_from_path)
    db: AsyncSession = Depends(get_db)

    @router.get("/markers/{marker}/comments")
    async def list_marker_comments(
            self,
            marker_model: models.Marker = Depends(get_marker_from_path)
    ) -> schemas.StandardListResponse[schemas.CommentRead]:
        if marker_model.map_id != self.map_model.id:
            raise BizError(ErrorCode.MarkerNotFoundError)

        stmt = (
            select(models.Comment).
            where(models.Comment.target_type == schemas.CommentTargetType.marker).
            where(models.Comment.target_id == marker_model.id).
            order_by(models.Comment.created_at)
        )
        if not self.user.is_superuser:
            stmt = stmt.where(or_(
                models.Comment.verified.is_(True),
                models.Comment.user_id == self.user.id,
            ))

        result = await self.db.execute(stmt)
        comments = [schemas.CommentRead.model_validate(x) for x in result.unique().scalars()]
        return schemas.StandardListResponse(comments)

    @router.post("/markers/{marker}/comments")
    async def create_marker_comment(
            self,
            comment_data: schemas.CommentCreate,
            marker_model: models.Marker = Depends(get_marker_from_path)
    ) -> schemas.StandardResponse[schemas.CommentRead]:
        if marker_model.map_id != self.map_model.id:
            raise BizError(ErrorCode.MarkerNotFoundError)

        if comment_data.reply_to_id is None:
            reply_to_id = None
            root_id = None
        else:
            result = await self.db.execute(
                select(models.Comment).where(models.Comment.id == comment_data.reply_to_id)
            )
            reply_to_comment: models.Comment | None = result.unique().scalar_one_or_none()
            if reply_to_comment is None:
                raise BizError(ErrorCode.MarkerNotFoundError)
            reply_to_id = reply_to_comment.id
            if reply_to_comment.root_id is None:
                root_id = reply_to_id
            else:
                root_id = reply_to_comment.root_id

        verified = self.user.is_superuser
        comment = models.Comment(
            user_id=self.user.id,
            target_type=schemas.CommentTargetType.marker,
            target_id=marker_model.id,
            content=comment_data.content,
            verified=verified,
            root_id=root_id,
            reply_to_id=reply_to_id
        )
        self.db.add(comment)
        await self.db.commit()
        await self.db.refresh(comment)
        return schemas.CommentRead.model_validate(comment).to_response()

    @router.get("/marker_comments", dependencies=[Depends(get_current_superuser)])
    async def list_all_marker_comments(
            self,
            limit: int = Query(100),
            offset: int = Query(0),
    ) -> schemas.StandardListResponse[schemas.MarkerCommentRead]:
        stmt = (
            select(models.MarkerComment).
            where(models.MarkerComment.marker.has(
                models.Marker.map_id == self.map_model.id
            )).
            # where(models.MarkerComment.target_type == schemas.CommentTargetType.marker).
            order_by(desc(models.MarkerComment.created_at)).
            limit(limit).offset(offset)
        )
        result = await self.db.execute(stmt)
        comments = [schemas.MarkerCommentRead.model_validate(x) for x in result.unique().scalars()]
        count = await marker_comment_crud.count(self.db)
        return schemas.StandardListResponse(comments, count)

    async def get_comment_model(self, comment_id: UUID):
        stmt = (
            select(models.Comment).
            where(models.Comment.id == comment_id).
            where(models.Comment.target_type == "marker")
        )
        result = await self.db.execute(stmt)
        comment_model: models.Comment = result.unique().scalar_one_or_none()
        if comment_model is None:
            raise BizError(ErrorCode.CommentNotFoundError)
        return comment_model

    @router.post("/marker_comments/{comment}", dependencies=[Depends(get_current_superuser)])
    async def verify_marker_comment(
            self,
            verified: bool = Query(True),
            comment_id: UUID = Path(..., alias="comment"),
    ) -> schemas.StandardResponse[schemas.CommentRead]:
        comment_model = await self.get_comment_model(comment_id)
        comment_model.verified = verified
        self.db.add(comment_model)
        await self.db.commit()
        await self.db.refresh(comment_model)
        return schemas.CommentRead.model_validate(comment_model).to_response()

    @router.delete("/marker_comments/{comment}", dependencies=[Depends(get_current_superuser)])
    async def delete_marker_comment(
            self,
            comment_id: UUID = Path(..., alias="comment"),
    ) -> schemas.StandardResponse[schemas.Empty]:
        comment_model = await self.get_comment_model(comment_id)
        await self.db.delete(comment_model)
        await self.db.commit()
        return schemas.StandardResponse()

@cbv(router)
class MarkerFeedback:
    user: models.User = Depends(get_current_user)
    map_model: models.Map = Depends(get_map_from_path)
    db: AsyncSession = Depends(get_db)
    s3_client: AioBaseClient = Depends(s3_client_upload_dependency)

    @router.get("/marker_feedbacks")
    async def list_marker_feedbacks(
            self,
            admin: bool = Query(False),
            limit: int = Query(100),
            offset: int = Query(0),
    ) -> schemas.StandardListResponse[schemas.MarkerFeedbackRead]:
        count = 0
        stmt = select(models.MarkerFeedback).where(models.MarkerFeedback.map_id == self.map_model.id)
        if admin:
            if not self.user.is_superuser:
                raise BizError(ErrorCode.UnauthorizedError)
            stmt = (
                stmt.where(models.MarkerFeedback.type == schemas.MarkerFeedbackType.CREATE).
                limit(limit).offset(offset)
            )
            count = await marker_feedback_crud.count(self.db, map_id=self.map_model.id, type=schemas.MarkerFeedbackType.CREATE)
        else:
            stmt = (
                stmt.where(models.MarkerFeedback.user_id == self.user.id).
                where(and_(
                    models.MarkerFeedback.status != schemas.MarkerFeedbackStatus.ACCEPTED,
                    models.MarkerFeedback.status != schemas.MarkerFeedbackStatus.DELETED,
                ))
            )
        stmt = stmt.order_by(desc(models.MarkerFeedback.created_at))
        result = await self.db.execute(stmt)
        feedbacks = [schemas.MarkerFeedbackRead.model_validate(x) for x in result.unique().scalars()]
        if not admin:
            count = len(feedbacks)
        return schemas.StandardListResponse(feedbacks, count)

    @staticmethod
    def process_image(file: BinaryIO):
        img = load_normalized_image(file)
        full_bytes = make_full_image(img)
        return {
            "full": full_bytes,
            "width": img.width,
            "height": img.height,
            "digest": sha256_base64url(full_bytes),
        }

    async def _upload_image(self, file: UploadFile):
        image_data = await asyncio.to_thread(self.process_image, file.file)
        s3_key = f"marker_feedbacks_images/{image_data['digest']}"
        try:
            await self.s3_client.put_object(
                Bucket=settings.S3_BUCKET,
                Key=f"{s3_key}.webp",
                Body=image_data["full"],
                ContentType="image/webp",
            )
        except ClientError as e:
            raise BizError(ErrorCode.S3UploadError, str(e))

        result = await self.db.execute(
            select(models.Image).
            where(models.Image.s3_key == s3_key)
        )
        image_model = result.unique().scalar_one_or_none()
        if image_model is None:
            image_data = schemas.ImageCreate(
                s3_key=s3_key,
                height=image_data["height"],
                width=image_data["width"],
            )
            image_model = await image_crud.create(self.db, image_data)
        return image_model

    async def delete_image(self, image_id: UUID):
        count = await self.db.scalar(
            select(func.count())
            .select_from(models.MarkerFeedback)
            .where(models.MarkerFeedback.image_id == image_id)
        )
        if count == 0:
            result = await self.db.execute(
                select(models.Image).where(models.Image.id == image_id)
            )
            image_model = result.unique().scalar_one_or_none()
            if image_model is not None:
                s3_key = image_model.s3_key
                await self.db.delete(image_model)
                try:
                    await self.s3_client.delete_object(
                        Bucket=settings.S3_BUCKET,
                        Key=f"{s3_key}.webp",
                    )
                except ClientError as e:
                    raise BizError(ErrorCode.S3UploadError, str(e))
                await self.db.commit()

    @staticmethod
    def get_marker_feedback_form(
            type: schemas.MarkerFeedbackType = Form(schemas.MarkerFeedbackType.CREATE),
            marker_id: UUID | None = Form(None),
            subtype_id: UUID | str | None = Form(None),
            x: int | None = Form(None),
            y: int | None = Form(None),
            name: None | str = Form(None),
            description: None | str = Form(None),
    ):
        return schemas.MarkerFeedbackUpdate(
            type=type, marker_id=marker_id, subtype_id=subtype_id, x=x, y=y,
            name=name, description=description,
        )

    @router.post("/marker_feedbacks")
    async def create_marker_feedback(
            self,
            data: schemas.MarkerFeedbackUpdate = Depends(get_marker_feedback_form),
            file: UploadFile | None = File(None),
    ) -> schemas.StandardResponse[schemas.MarkerFeedbackRead]:
        if data.subtype_id is not None:
            subtype_model = await get_subtype_from_path(data.subtype_id, self.db)
            subtype_id = subtype_model.id
        else:
            subtype_id = None
        if data.marker_id is not None:
            marker_model = await get_marker_from_path(data.marker_id, self.db)
            marker_id = marker_model.id
        else:
            marker_id = None

        if file is not None:
            image_model = await self._upload_image(file)
            image_id = image_model.id
        else:
            image_id = None

        feedback = models.MarkerFeedback(
            map_id=self.map_model.id,
            subtype_id=subtype_id,
            marker_id=marker_id,
            user_id=self.user.id,
            image_id=image_id,
            type=data.type,
            x=data.x,
            y=data.y,
            name=data.name,
            description=data.description,
            status=schemas.MarkerFeedbackStatus.PENDING,
        )
        self.db.add(feedback)
        await self.db.commit()
        await self.db.refresh(feedback)
        return schemas.MarkerFeedbackRead.model_validate(feedback).to_response()

    async def get_feedback_model(self, feedback_id: UUID, user_id: UUID | None = None):
        stmt = (
            select(models.MarkerFeedback).
            where(models.MarkerFeedback.id == feedback_id).
            where(models.MarkerFeedback.map_id == self.map_model.id)
        )
        if user_id is not None:
            stmt = stmt.where(models.MarkerFeedback.user_id == user_id)

        result = await self.db.execute(stmt)
        feedback_model: models.MarkerFeedback = result.unique().scalar_one_or_none()
        if feedback_model is None:
            raise BizError(ErrorCode.MarkerNotFoundError)
        if feedback_model.status == schemas.MarkerFeedbackStatus.DELETED:
            raise BizError(ErrorCode.MarkerFeedbackNotEditableError)
        return feedback_model

    async def _update_marker_feedback(self, feedback_model: models.MarkerFeedback, data: schemas.MarkerFeedbackUpdate):
        if data.subtype_id is not None:
            subtype_model = await get_subtype_from_path(data.subtype_id, self.db)
            if subtype_model is None:
                subtype_id = None
            else:
                subtype_id = subtype_model.id
            feedback_model.subtype_id = subtype_id
        if data.x is not None:
            feedback_model.x = data.x
        if data.y is not None:
            feedback_model.y = data.y
        if data.name is not None:
            feedback_model.name = data.name
        if data.description is not None:
            feedback_model.description = data.description
        return feedback_model

    @router.patch("/marker_feedbacks/{feedback}")
    async def update_marker_feedback(
            self,
            data: schemas.MarkerFeedbackUpdate = Depends(get_marker_feedback_form),
            feedback_id: UUID = Path(..., alias="feedback"),
            file: UploadFile | None = File(None),
    ) -> schemas.StandardResponse[schemas.MarkerFeedbackRead]:
        feedback_model = await self.get_feedback_model(feedback_id, self.user.id)
        feedback_model.status = schemas.MarkerFeedbackStatus.PENDING
        if file is not None:
            image_model = await self._upload_image(file)
            image_id = image_model.id
            old_image_id = feedback_model.image_id
        else:
            image_id = None
            old_image_id = None

        feedback_model = await self._update_marker_feedback(feedback_model, data)

        if image_id is not None:
            feedback_model.image_id = image_id

        self.db.add(feedback_model)
        await self.db.commit()
        await self.db.refresh(feedback_model)

        # remove image if necessary
        if old_image_id is not None:
            await self.delete_image(old_image_id)

        return schemas.MarkerFeedbackRead.model_validate(feedback_model).to_response()

    @router.delete("/marker_feedbacks/{feedback}")
    async def delete_marker_feedback(
            self,
            feedback_id: UUID = Path(..., alias="feedback"),
    ) -> schemas.StandardResponse[schemas.MarkerFeedbackRead]:
        feedback_model = await self.get_feedback_model(feedback_id, self.user.id)
        feedback_model.status = schemas.MarkerFeedbackStatus.DELETED
        self.db.add(feedback_model)
        await self.db.commit()
        await self.db.refresh(feedback_model)
        return schemas.MarkerFeedbackRead.model_validate(feedback_model).to_response()

    @router.post("/marker_feedbacks/{feedback}", dependencies=[Depends(get_current_superuser)])
    async def reply_marker_feedback(
            self,
            data: schemas.MarkerFeedbackReply,
            feedback_id: UUID = Path(..., alias="feedback"),
            s3_client: AioBaseClient = Depends(s3_client_upload_dependency),
    ) -> schemas.StandardResponse[schemas.MarkerFeedbackRead]:
        feedback_model = await self.get_feedback_model(feedback_id)
        feedback_model = await self._update_marker_feedback(feedback_model, data)
        feedback_model.status = data.status
        feedback_model.reply = data.reply
        self.db.add(feedback_model)
        await self.db.commit()
        await self.db.refresh(feedback_model)
        if data.status == schemas.MarkerFeedbackStatus.ACCEPTED:
            if feedback_model.subtype_id:
                index_in_subtype = await get_next_index_for_subtype(
                    self.db, self.map_model.id, feedback_model.subtype_id
                )
            else:
                index_in_subtype = 0
            marker_model = models.Marker(
                map_id=self.map_model.id,
                subtype_id=feedback_model.subtype_id,
                x=feedback_model.x,
                y=feedback_model.y,
                index_in_subtype=index_in_subtype,
                name="",
            )
            self.db.add(marker_model)
            await self.db.commit()
            await self.db.refresh(marker_model)
            language_model = await get_language_from_path(data.language, self.db)
            if language_model is not None:
                marker_translation_model = models.MarkerTranslation(
                    marker_id=marker_model.id,
                    language_id=language_model.id,
                    name=feedback_model.name,
                    description=feedback_model.description,
                )
                self.db.add(marker_translation_model)
            await self.db.commit()
            await update_marker_contributor(self.db, marker_model.id, feedback_model.user_id)

            if feedback_model.image_id is not None:
                try:
                    resp = await s3_client.get_object(
                        Bucket=settings.S3_BUCKET,
                        Key=f"{feedback_model.image.s3_key}.webp",
                    )
                    data = await resp["Body"].read()
                except ClientError as e:
                    raise BizError(ErrorCode.S3UploadError, str(e))
                await upload_image(self.db, s3_client, marker_model.id, BytesIO(data))
            await clear_cache(f"data:markers:{self.map_model.name}")

        return schemas.MarkerFeedbackRead.model_validate(feedback_model).to_response()


@cbv(router)
class MarkerTranslations:
    user: models.User = Depends(get_current_superuser)
    map_model: models.Map = Depends(get_map_from_path)
    marker_model: models.Marker = Depends(get_marker_from_path)
    language_model: models.Language = Depends(get_language_from_path)
    db: AsyncSession = Depends(get_db)

    async def get_translation_model(self) -> models.MarkerTranslation:
        if self.marker_model.map_id != self.map_model.id:
            raise BizError(ErrorCode.MarkerNotFoundError)
        result = await self.db.execute(select(models.MarkerTranslation).filter(
            models.MarkerTranslation.language_id == self.language_model.id,
            models.MarkerTranslation.marker_id == self.marker_model.id,
        ))
        return result.unique().scalar_one_or_none()

    @router.patch("/markers/{marker}/translations/{language}")
    async def update_marker_translation(
            self,
            translation_data: schemas.MarkerTranslationUpdate,
    ) -> schemas.StandardResponse[schemas.MarkerTranslationRead]:
        translation_model = await self.get_translation_model()
        if translation_model is None:
            translation_model = models.MarkerTranslation(
                marker_id=self.marker_model.id,
                language_id=self.language_model.id,
                name=translation_data.name or "",
                description=translation_data.description or "",
            )
        else:
            if translation_data.name is not None:
                translation_model.name = translation_data.name
            if translation_data.description is not None:
                translation_model.description = translation_data.description

        self.db.add(translation_model)
        await self.db.commit()
        await self.db.refresh(translation_model)
        await update_marker_contributor(self.db, self.marker_model.id, self.user.id)
        await clear_cache(f"locales:{self.language_model.language_code}:markers:{self.map_model.name}")
        return schemas.MarkerTranslationRead.model_validate(translation_model).to_response()

    @router.delete("/markers/{marker}/translations/{language}")
    async def delete_marker_translation(self) -> schemas.StandardResponse[schemas.Empty]:
        translation_model = await self.get_translation_model()
        if translation_model is not None:
            await self.db.delete(translation_model)
            await self.db.commit()
            await clear_cache(f"locales:{self.language_model.language_code}:markers:{self.map_model.name}")
        return schemas.StandardResponse()
