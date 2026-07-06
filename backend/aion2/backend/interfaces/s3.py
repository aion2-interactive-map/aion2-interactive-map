import aioboto3
from aiobotocore.client import AioBaseClient
from botocore.config import Config

from aion2.backend.config.manager import settings
from aion2.backend.utilities.exceptions import BizError, ErrorCode


def get_s3_session() -> aioboto3.Session:
    return aioboto3.Session(
        aws_access_key_id=settings.S3_USERNAME,
        aws_secret_access_key=settings.S3_PASSWORD,
    )

async def s3_client_upload_dependency():
    if settings.S3_PUBLIC_URL:
        endpoint_url = settings.S3_PUBLIC_URL
    elif settings.S3_HOST:
        endpoint_url = f"http://{settings.S3_HOST}:{settings.S3_PORT}"
    else:
        raise BizError(ErrorCode.S3ConfigError)
    async with get_s3_session().client("s3", endpoint_url=endpoint_url, config=Config(
        signature_version='s3',
        s3={'addressing_style': 'virtual'}
    )) as s3:
        yield s3


