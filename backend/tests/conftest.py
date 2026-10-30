"""Configuración de pruebas.

Usan una base PostgreSQL real (`zcorp_pruebas`), separada de la de desarrollo. Se crea si no existe,
se le aplican las migraciones una vez por ejecución y se vacía antes de cada prueba.
Necesita la base levantada: `docker compose up -d db redis` (en CI, un servicio).
"""

import os

# Antes de importar la app: la configuración se lee al importarla.
os.environ.setdefault("SECRET_KEY", "clave-de-pruebas-de-al-menos-32-caracteres")

from collections.abc import Callable, Generator  # noqa: E402

import pytest  # noqa: E402
import redis  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import Engine, create_engine, text  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402

from app.api.deps import get_db  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.main import app  # noqa: E402

Cabeceras = dict[str, str]

# Roles que crea la migración 0001.
ADMINISTRADOR, EDITOR, REDACTOR, INVITADO = 1, 2, 3, 4

URL_PRUEBAS = make_url(os.environ.get("DATABASE_URL_PRUEBAS") or settings.DATABASE_URL).set(database="zcorp_pruebas")
TABLAS_DE_DATOS = "visitas, articulo_etiqueta, articulos, etiquetas, tokens_refresco, usuarios"


def _crear_base_si_falta() -> None:
    admin = create_engine(URL_PRUEBAS.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as conexion:
        if not conexion.scalar(text("SELECT 1 FROM pg_database WHERE datname = 'zcorp_pruebas'")):
            conexion.execute(text("CREATE DATABASE zcorp_pruebas"))
    admin.dispose()


@pytest.fixture(scope="session")
def engine() -> Generator[Engine, None, None]:
    _crear_base_si_falta()
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", URL_PRUEBAS.render_as_string(hide_password=False))
    command.upgrade(config, "head")
    motor = create_engine(URL_PRUEBAS)
    yield motor
    motor.dispose()


@pytest.fixture()
def session_factory(engine: Engine) -> sessionmaker[Session]:
    with engine.begin() as conexion:
        conexion.execute(text(f"TRUNCATE {TABLAS_DE_DATOS} RESTART IDENTITY CASCADE"))
        # Los 4 roles de la migración se conservan; los creados en una prueba, no.
        conexion.execute(text("DELETE FROM roles WHERE id > 4"))
        conexion.execute(text("DELETE FROM categorias WHERE id > 6"))  # las 6 de la migración 0002 se quedan
    # Los intentos de ingreso viven en Redis: cada prueba empieza sin bloqueos.
    cliente = redis.Redis.from_url(settings.REDIS_URL)
    for patron in ("login:*", "visitas:*"):
        for clave in cliente.scan_iter(patron):
            cliente.delete(clave)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture()
def db(session_factory: sessionmaker[Session]) -> Generator[Session, None, None]:
    with session_factory() as sesion:
        yield sesion


@pytest.fixture()
def client(session_factory: sessionmaker[Session]) -> Generator[TestClient, None, None]:
    def get_db_pruebas() -> Generator[Session, None, None]:
        with session_factory() as sesion:
            yield sesion

    app.dependency_overrides[get_db] = get_db_pruebas
    with TestClient(app) as cliente:
        yield cliente
    app.dependency_overrides.clear()


@pytest.fixture()
def registrar(client: TestClient) -> Callable[..., dict]:
    """Registra una cuenta y devuelve la sesión completa (tokens + usuario)."""

    def _registrar(email: str = "ana@example.com", nombre: str = "Ana", contrasena: str = "clave-segura-1") -> dict:
        r = client.post(
            "/api/v1/auth/registro",
            json={"email": email, "nombre": nombre, "contrasena": contrasena, "acepta_terminos": True},
        )
        assert r.status_code == 201, r.text
        return r.json()

    return _registrar


def cabeceras(sesion: dict) -> Cabeceras:
    return {"Authorization": f"Bearer {sesion['token_acceso']}"}


def dar_rol(db: Session, sesion: dict, rol_id: int | None) -> Cabeceras:
    from app.models import Usuario

    u = db.get(Usuario, sesion["usuario"]["id"])
    assert u is not None
    u.rol_id = rol_id
    db.commit()
    return cabeceras(sesion)
