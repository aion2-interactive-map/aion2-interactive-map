from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import yaml
from loguru import logger

from aion2.backend import models, schemas
from aion2.backend.config.manager import settings
from aion2.backend.interfaces.db import get_db
from aion2.backend.services.categories import category_translation_crud
from aion2.backend.services.regions import region_crud

DATA_DIR = settings.PUBLIC_DIR / "data"
LOCALES_DIR = settings.PUBLIC_DIR / "locales"

async def export_languages(db: AsyncSession):
    language_models = await db.execute(select(models.Language))
    languages = [x.language_code for x in language_models.unique().scalars().all()]
    return languages

async def export_maps(db: AsyncSession):
    map_models = await db.execute(
        select(models.Map)
        # .where(models.Map.is_visible.is_(True))
        .order_by(models.Map.order)
    )
    maps = []
    for map_model in map_models.unique().scalars():
        map_data = schemas.MapRead.model_validate(map_model)
        maps.append({**map_data.model_dump(by_alias=True),"id": str(map_data.id)})
    return {"maps": maps}


async def export_map_translations(db: AsyncSession, language_code: str):
    map_translation_models = await db.execute(
        select(models.MapTranslation).
        where(models.MapTranslation.language.has(models.Language.language_code  == language_code))
    )
    map_translations = {}
    for map_translation_model in map_translation_models.unique().scalars().all():
        map_translation_model: models.MapTranslation
        map_translations[map_translation_model.map.name] = {
            "name": map_translation_model.name,
            "description": map_translation_model.description,
        }
    return map_translations


async def export_types(db: AsyncSession):
    category_models = await db.execute(select(models.Category).order_by(models.Category.order))
    categories = []
    subtype_category_map = {}
    for category_model in category_models.unique().scalars().all():
        category_data = schemas.CategoryRead.model_validate(category_model)
        subtypes = []
        for subtype_model in category_model.subtypes:
            subtype_category_map[subtype_model.id] = (category_model.name, subtype_model.name)
            subtype_data = schemas.SubtypeRead.model_validate(subtype_model)
            subtypes.append({**subtype_data.model_dump(by_alias=True), "id": str(subtype_data.id)})
        categories.append(
            {**category_data.model_dump(by_alias=True), "id": str(category_data.id), "subtypes": subtypes})

    return {"categories": categories}


async def export_type_translations(db: AsyncSession, language_code: str):
    category_translation_models = await db.execute(
        select(models.CategoryTranslation).
        where(models.CategoryTranslation.language.has(models.Language.language_code == language_code))
    )
    category_translations = {}
    for translation in category_translation_models.unique().scalars().all():
        translation: models.CategoryTranslation
        category_translations[translation.category.name] = {
            "name": translation.name,
        }

    subtype_translation_models = await db.execute(
        select(models.SubtypeTranslation).
        where(models.SubtypeTranslation.language.has(models.Language.language_code == language_code))
    )
    subtype_translations = {}
    for translation in subtype_translation_models.unique().scalars().all():
        translation: models.SubtypeTranslation
        subtype_translations[translation.subtype.name] = {
            "name": translation.name,
            "description": translation.description,
        }
    return {"categories": category_translations, "subtypes": subtype_translations}

async def export_regions(db: AsyncSession,  map_name: str):
    region_models = await db.execute(
        select(models.Region).
        where(models.Region.map.has(models.Map.name == map_name))
    )
    regions = []
    for region_model in region_models.unique().scalars().all():
        region_model: models.Region
        region_data = schemas.RegionRead.model_validate(region_model)
        region_dict = {
            **region_data.model_dump(
                by_alias=True,
                exclude={"map_id"}
            ),
            "id": str(region_data.id),
        }
        regions.append(region_dict)
    return {"regions": regions}


async def export_region_translations(db: AsyncSession, language_code: str, map_name: str):
    region_translation_models = await db.execute(
        select(models.RegionTranslation).
        where(models.RegionTranslation.region.has(
            models.Marker.map.has(models.Map.name == map_name)
        )).
        where(models.RegionTranslation.language.has(models.Language.language_code == language_code))
    )
    region_translations = {}
    for translation in region_translation_models.unique().scalars().all():
        translation: models.RegionTranslation
        region_translations[str(translation.region.name)] = {
            "name": translation.name,
            "description": translation.description,
        }
    return region_translations



async def export_markers(db: AsyncSession, map_name: str):
    marker_models = await db.execute(
        select(models.Marker).
        where(models.Marker.map.has(models.Map.name == map_name))
    )
    markers = []
    for marker_model in marker_models.unique().scalars().all():
        marker_model: models.Marker
        marker_data = schemas.MarkerRead.model_validate(marker_model)
        marker_dict = {
            **marker_data.model_dump(
                by_alias=True,
                exclude={"map_id", "subtype_id", "region_id", "images"}
            ),
            "id": str(marker_data.id),
            "subtype": marker_model.subtype.name,
            "type": marker_model.type,
        }
        if marker_model.images:
            marker_dict["images"] = [
                x.image.s3_key for x in marker_model.images
            ]
        marker_dict["contributors"] = [
            x.user.name for x in marker_model.contributors
        ]
        if marker_model.region:
            marker_dict["region"] = marker_model.region.name
        markers.append(marker_dict)
    return {"markers": markers}

async def export_marker_translations(db: AsyncSession, language_code: str, map_name: str):
    marker_translation_models = await db.execute(
        select(models.MarkerTranslation).
        where(models.MarkerTranslation.marker.has(
            models.Marker.map.has(models.Map.name == map_name)
        )).
        where(models.MarkerTranslation.language.has(models.Language.language_code == language_code))
    )
    marker_translations = {}
    for translation in marker_translation_models.unique().scalars().all():
        translation: models.MarkerTranslation
        marker_translations[str(translation.marker_id)] = {
            "name": translation.name,
            "description": translation.description,
        }
    return marker_translations


async def export_data(db: AsyncSession):
    language_models = await db.execute(select(models.Language))
    languages = [x.language_code for x in language_models.unique().scalars().all()]

    # export maps
    map_models = await db.execute(select(models.Map).order_by(models.Map.order))
    maps = []
    map_translations = {x: {} for x in languages}
    for map_model in map_models.unique().scalars():
        map_data = schemas.MapRead.model_validate(map_model)
        maps.append({**map_data.model_dump(by_alias=True),"id": str(map_data.id)})
        for translation in map_model.translations:
            map_translations[translation.language.language_code][map_data.name] = {
                "name": translation.name,
                "description": translation.description,
            }

    filename = DATA_DIR / "maps.yaml"
    filename.parent.mkdir(parents=True, exist_ok=True)
    with filename.open("w", encoding="utf-8") as f:
        yaml.dump({"maps": maps}, f, allow_unicode=True)

    for language, translations in map_translations.items():
        filename = LOCALES_DIR / str(language) / "maps.yaml"
        filename.parent.mkdir(parents=True, exist_ok=True)
        with filename.open("w", encoding="utf-8") as f:
            yaml.dump(translations, f, allow_unicode=True)

    # export types
    category_models = await db.execute(select(models.Category).order_by(models.Category.order))
    categories = []
    category_translations = {x: {} for x in languages}
    subtype_category_map = {}
    for category_model in category_models.unique().scalars().all():
        category_data = schemas.CategoryRead.model_validate(category_model)
        subtypes = []
        for subtype_model in category_model.subtypes:
            subtype_category_map[subtype_model.id] = (category_model.name, subtype_model.name)
            subtype_data = schemas.SubtypeRead.model_validate(subtype_model)
            subtypes.append({**subtype_data.model_dump(by_alias=True),"id": str(subtype_data.id)})
        categories.append({**category_data.model_dump(by_alias=True),"id": str(category_data.id), "subtypes": subtypes})
        for translation in category_model.translations:
            category_translations[translation.language.language_code][category_model.name] = {
                "name": translation.name,
            }
    subtype_models = await db.execute(select(models.Subtype))
    subtype_translations = {x: {} for x in languages}
    for subtype_model in subtype_models.unique().scalars().all():
        for translation in subtype_model.translations:
            subtype_translations[translation.language.language_code][subtype_model.name] = {
                "name": translation.name,
                "description": translation.description,
            }

    filename = DATA_DIR / "types.yaml"
    filename.parent.mkdir(parents=True, exist_ok=True)
    with filename.open("w", encoding="utf-8") as f:
        yaml.dump({"categories": categories}, f, allow_unicode=True)

    for language in languages:
        filename = LOCALES_DIR / str(language) / "types.yaml"
        filename.parent.mkdir(parents=True, exist_ok=True)
        type_translations = {
            "categories": category_translations[language],
            "subtypes": subtype_translations[language],
        }

        with filename.open("w", encoding="utf-8") as f:
            yaml.dump(type_translations, f, allow_unicode=True)

    for map_data in maps:
        map_name = map_data["name"]
        regions = await export_regions(db, map_name)
        filename = DATA_DIR / "regions" / f"{map_name}.yaml"
        filename.parent.mkdir(parents=True, exist_ok=True)
        with filename.open("w", encoding="utf-8") as f:
            yaml.dump({"regions": regions}, f, allow_unicode=True)

        for language in languages:
            translations = await export_region_translations(db, language, map_name)
            filename = LOCALES_DIR / str(language) / "regions" / f"{map_name}.yaml"
            filename.parent.mkdir(parents=True, exist_ok=True)
            with filename.open("w", encoding="utf-8") as f:
                yaml.dump(translations, f, allow_unicode=True)


    # export markers
    for map_data in maps:
        map_name = map_data["name"]
        marker_models = await db.execute(select(models.Marker).where(models.Marker.map_id == map_data["id"]))
        markers = []
        marker_translations = {x: {} for x in languages}
        for marker_model in marker_models.unique().scalars().all():
            marker_data = schemas.MarkerRead.model_validate(marker_model)
            category, subtype = subtype_category_map[marker_model.subtype_id]
            marker_dict = {
                **marker_data.model_dump(
                    by_alias=True,
                    exclude={"map_id", "subtype_id", "region_id", "images"}
                ),
                "id": str(marker_data.id),
                "category": category,
                "subtype": subtype,
            }
            if marker_model.images:
                marker_dict["images"] = [
                    x.image.s3_key for x in marker_model.images
                ]
            if marker_model.region:
                marker_dict["region"] = marker_model.region.name
            markers.append(marker_dict)
            for translation in marker_model.translations:
                marker_translations[translation.language.language_code][str(marker_model.id)] = {
                    "name": translation.name,
                    "description": translation.description,
                }

        filename = DATA_DIR / "markers" / f"{map_name}.yaml"
        filename.parent.mkdir(parents=True, exist_ok=True)
        with filename.open("w", encoding="utf-8") as f:
            yaml.dump({"markers": markers}, f, allow_unicode=True)

        for language, translations in marker_translations.items():
            filename = LOCALES_DIR / str(language) / "markers" / f"{map_name}.yaml"
            filename.parent.mkdir(parents=True, exist_ok=True)
            with filename.open("w", encoding="utf-8") as f:
                yaml.dump(translations, f, allow_unicode=True)

