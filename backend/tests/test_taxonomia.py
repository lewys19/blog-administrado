from collections.abc import Callable

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import ADMINISTRADOR, REDACTOR, dar_rol
from tests.test_articulos import articulo, carpeta_imagenes  # noqa: F401 (fixture)

PANEL = "/api/v1/panel"


def test_categorias_iniciales_y_dos_niveles(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), ADMINISTRADOR)
    nombres = [c["nombre"] for c in client.get("/api/v1/blog/categorias").json()]
    assert nombres == ["Programación", "Python", "FastAPI", "SQL", "QA", "IA"]
    docker = client.post(f"{PANEL}/categorias", json={"nombre": "Docker", "padre_id": 1}, headers=h).json()
    assert docker["slug"] == "docker" and docker["padre_id"] == 1
    assert client.post(f"{PANEL}/categorias", json={"nombre": "Compose", "padre_id": docker["id"]}, headers=h).status_code == 400
    assert client.post(f"{PANEL}/categorias", json={"nombre": "docker"}, headers=h).status_code == 409
    assert client.delete(f"{PANEL}/categorias/1", headers=h).status_code == 409  # tiene subcategoría
    # Con artículos no se borra.
    client.post(f"{PANEL}/articulos", json=articulo(categoria_id=docker["id"]), headers=h)
    r = client.delete(f"{PANEL}/categorias/{docker['id']}", headers=h)
    assert r.status_code == 409 and "1 artículo" in r.json()["detail"]


def test_etiquetas(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), ADMINISTRADOR)
    client.post(f"{PANEL}/articulos", json=articulo(etiquetas=["Docker", "docker", "Redis"], estado="publicado"), headers=h)
    etiquetas = {e["nombre"]: e for e in client.get(f"{PANEL}/etiquetas", headers=h).json()}
    assert set(etiquetas) == {"Docker", "Redis"}  # «docker» repetida no se duplica
    assert client.put(f"{PANEL}/etiquetas/{etiquetas['Redis']['id']}", json={"nombre": "Redis 8"}, headers=h).json()["nombre"] == "Redis 8"
    assert client.delete(f"{PANEL}/etiquetas/{etiquetas['Docker']['id']}", headers=h).status_code == 204
    assert [e["nombre"] for e in client.get("/api/v1/blog/etiquetas").json()] == ["Redis 8"]


def test_redactor_no_administra_categorias(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), REDACTOR)
    assert client.get(f"{PANEL}/categorias", headers=h).status_code == 200
    assert client.post(f"{PANEL}/categorias", json={"nombre": "Nueva"}, headers=h).status_code == 403
