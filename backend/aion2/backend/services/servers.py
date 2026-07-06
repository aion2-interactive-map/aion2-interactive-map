from fastapi_utils.cbv import cbv
from fastcrud import FastCRUD
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from aion2.backend import models, schemas
from aion2.backend.utilities.dependencies import get_db, get_current_superuser, get_server_from_path

router = APIRouter(prefix="/servers", tags=["servers"])

server_crud = FastCRUD(models.Server)

@cbv(router)
class Servers:
    db: AsyncSession = Depends(get_db)

    @router.post("/")
    async def create_server(
        self,
        server_data: schemas.ServerCreate,
        user: models.User = Depends(get_current_superuser),
    ) -> schemas.StandardResponse[schemas.ServerRead]:
        server_model = await server_crud.create(self.db, server_data)
        return schemas.ServerRead.model_validate(server_model).to_response()

    @router.get("/")
    async def list_servers(self) -> schemas.StandardListResponse[schemas.ServerRead]:
        count = await server_crud.count(self.db)
        result = await server_crud.get_multi(self.db)
        servers = [schemas.ServerRead.model_validate(x) for x in result["data"]]
        return schemas.StandardListResponse(servers, count)

    @router.get("/{server}")
    async def get_server(
        self,
        server_model: models.Server = Depends(get_server_from_path)
    ) -> schemas.StandardResponse[schemas.ServerRead]:
        return schemas.ServerRead.model_validate(server_model).to_response()

    @router.patch("/{server}")
    async def update_server(
        self,
        server_data: schemas.ServerUpdate,
        server_model: models.Server = Depends(get_server_from_path),
        user: models.User = Depends(get_current_superuser),
    ) -> schemas.StandardResponse[schemas.ServerRead]:
        await server_crud.update(
            self.db, server_data, id=server_model.id,
        )
        await self.db.refresh(server_model)
        return schemas.ServerRead.model_validate(server_model).to_response()

    @router.delete("/{server}")
    async def delete_server(
        self,
        server_model: models.Server = Depends(get_server_from_path),
        user: models.User = Depends(get_current_superuser),
    ) -> schemas.StandardResponse[schemas.Empty]:
        await self.db.delete(server_model)
        await self.db.commit()
        return schemas.StandardResponse()

