# aion2/backend/app/celery.py
from celery import Celery
from aion2.backend.config.manager import settings

# Generate the Redis URLs for broker and result backend using the provided settings
celery_broker_url = (
    f"redis://:{settings.REDIS_PASSWORD}@{settings.REDIS_HOST}:{settings.REDIS_PORT}/"
    f"{settings.CELERY_BROKER_DB_INDEX}"
)

celery_result_backend_url = (
    f"redis://:{settings.REDIS_PASSWORD}@{settings.REDIS_HOST}:{settings.REDIS_PORT}/"
    f"{settings.CELERY_RESULT_DB_INDEX}"
)

# Initialize Celery app
celery_app = Celery(
    "aion2_backend",  # name of the Celery app
    broker=celery_broker_url,  # Redis URL for the broker
    backend=celery_result_backend_url,  # Redis URL for the result backend
)

# Load configuration from settings
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],  # Only accept JSON to improve security
    timezone="UTC",  # Set the timezone as needed
    enable_utc=True,
    task_default_queue="default",
    task_queues={
        "default": {
            "exchange": "default",
            "routing_key": "default",
        },
        "high_priority": {
            "exchange": "high_priority",
            "routing_key": "high_priority",
        },
    },
)


def discover_tasks():
    celery_app.autodiscover_tasks(["aion2.backend.tasks.character"])


# Force discovery when running as worker/beat
discover_tasks()
