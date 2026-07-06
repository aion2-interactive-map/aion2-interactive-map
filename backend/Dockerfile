FROM tiangolo/uvicorn-gunicorn:python3.11-slim

ENV HOME="/root"
WORKDIR /root/aion2-backend

## install apt dependencies
#RUN --mount=type=cache,target=/var/cache/apt \
#    apt-get update && \
#    apt-get install -y --no-install-recommends git wget && \
#    rm -rf /var/lib/apt/lists/*
#
## install dockerize
#ENV DOCKERIZE_VERSION=v0.6.1
#RUN wget https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
#    && tar -C /usr/local/bin -xzvf dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
#    && rm dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz

# install poetry
ARG PYPI_MIRROR
RUN if [ -n "$PYPI_MIRROR" ]; then pip config set global.index-url $PYPI_MIRROR; fi
RUN --mount=type=cache,target=/root/.cache pip install poetry

# create virtualenv
ENV VIRTUAL_ENV=/root/.venv
RUN python3 -m virtualenv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# install dependencies
COPY pyproject.toml poetry.lock README.md /root/aion2-backend/
COPY aion2/backend/__init__.py /root/aion2-backend/aion2/backend/
RUN --mount=type=cache,target=/root/.cache poetry install
COPY . /root/aion2-backend
RUN --mount=type=cache,target=/root/.cache poetry install

EXPOSE $PORT

CMD poetry run alembic upgrade head && python3 -m aion2.backend




