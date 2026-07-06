from collections.abc import AsyncGenerator

from fastapi import Depends
from fastapi_users.db import SQLAlchemyBaseUserTableUUID, SQLAlchemyUserDatabase
from sqlalchemy import URL, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from loguru import logger

from aion2.backend.config.manager import settings


class Base(DeclarativeBase):
    pass


url_object = URL.create(
    "postgresql+asyncpg",
    username=settings.POSTGRES_USERNAME,
    password=settings.POSTGRES_PASSWORD,
    host=settings.POSTGRES_HOST,
    port=settings.POSTGRES_PORT,
    database=settings.POSTGRES_DATABASE,
)

engine = create_async_engine(
    url_object,
    echo=False,
    future=True,
)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)


AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
    autoflush=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    logger.info("Database Connection --- Establishing . . .")
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            # list tables in public schema
            result = await conn.execute(
                text("SELECT tablename FROM pg_tables WHERE schemaname='public'")
            )
            tables = [row[0] for row in result]
            logger.info("Found tables:", tables)
    except Exception as e:
        logger.info("Database Connection --- failed!")
        # logger.exception(e)
        raise