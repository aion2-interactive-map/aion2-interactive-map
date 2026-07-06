import os
import subprocess
import sys

import click
import uvicorn

from aion2.backend.config.manager import settings


def _run(cmd: list[str]) -> None:
    raise SystemExit(subprocess.call(cmd, env=os.environ.copy()))


@click.group(invoke_without_command=True)
@click.pass_context
def cli(ctx: click.Context) -> None:
    # Default command: serve
    if ctx.invoked_subcommand is None:
        ctx.invoke(serve)


@cli.command()
def serve() -> None:
    uvicorn.run(
        app="aion2.backend.app.fastapi:backend_app",
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        reload=settings.SERVER_WORKERS == 1 and settings.DEBUG,
        reload_dirs=["aion2/backend"],
        workers=settings.SERVER_WORKERS,
        log_level=settings.LOGGING_LEVEL,
        proxy_headers=True,
        forwarded_allow_ips="*",
    )


@cli.command()
@click.argument("worker_type", type=click.Choice(["preview", "default"]), default="default")
@click.option("--loglevel", default="info", show_default=True)
@click.option("--pool", default="solo", show_default=True, help="Use 'solo' on Windows.")
@click.option("--concurrency", type=int, default=None, help="Celery concurrency (optional).")
def celery(worker_type: str, loglevel: str, pool: str, concurrency: int | None) -> None:
    cmd = [
        sys.executable,
        "-m",
        "celery",
        "-A",
        "aion2.backend.app.celery",
        "worker",
        f"--loglevel={loglevel}",
        f"--pool={pool}",
    ]

    if worker_type == "preview":
        cmd.extend(["-Q", "high_priority", "-c", "1", "-n", "worker_preview@%h"])
    else:
        cmd.extend(["-Q", "high_priority,default", "-n", "worker_general@%h"])
        if concurrency is None:
            concurrency = 3

    if concurrency is not None:
        cmd.append(f"--concurrency={concurrency}")
    _run(cmd)


if __name__ == "__main__":
    cli()
