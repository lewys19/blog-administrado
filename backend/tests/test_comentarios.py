from collections.abc import Callable

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from tests.conftest import EDITOR, REDACTOR, dar_rol
from tests.test_articulos import articulo

API = "/api/v1"


def publicar(client: TestClient, registrar: Callable[..., dict], db: Session) -> tuple[str, dict]:
    h_ed = dar_rol(db, registrar("ed@example.com", "Eduardo"), EDITOR)
    a = client.post(f"{API}/panel/articulos", json=articulo(estado="publicado"), headers=h_ed).json()
    return a["slug"], h_ed


def comentar(client: TestClient, slug: str, **cambios: str) -> dict:
    datos = {"nombre": "Lucía", "correo": "lucia@example.com", "contenido": "¡Muy claro, gracias!", **cambios}
    r = client.post(f"{API}/blog/articulos/{slug}/comentarios", json=datos)
    assert r.status_code == 201, r.text
    return r.json()


def test_moderacion_completa(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    slug, h_ed = publicar(client, registrar, db)
    assert comentar(client, slug)["estado"] == "pendiente"
    # Pendiente: no se ve en el blog, sí en el panel (con el correo) y en el dashboard.
    assert client.get(f"{API}/blog/articulos/{slug}/comentarios").json() == []
    panel = client.get(f"{API}/panel/comentarios", headers=h_ed).json()
    assert panel["conteo"] == {"pendiente": 1, "aprobado": 0, "spam": 0}
    c = panel["comentarios"][0]
    assert (c["correo"], c["articulo"]["slug"]) == ("lucia@example.com", slug)
    assert client.get(f"{API}/panel/resumen", headers=h_ed).json()["comentarios_pendientes"] == 1

    assert client.patch(f"{API}/panel/comentarios/{c['id']}", json={"estado": "aprobado"}, headers=h_ed).status_code == 204
    publicos = client.get(f"{API}/blog/articulos/{slug}/comentarios").json()
    assert [p["nombre"] for p in publicos] == ["Lucía"] and "correo" not in publicos[0]
    assert client.get(f"{API}/blog/articulos/{slug}").json()["comentarios"] == 1

    # Ya aprobada una vez: lo siguiente con ese correo sale al instante (sin importar mayúsculas).
    assert comentar(client, slug, correo="LUCIA@example.com", contenido="Otra pregunta")["estado"] == "aprobado"
    assert len(client.get(f"{API}/blog/articulos/{slug}/comentarios").json()) == 2

    assert client.delete(f"{API}/panel/comentarios/{c['id']}", headers=h_ed).status_code == 204
    assert len(client.get(f"{API}/blog/articulos/{slug}/comentarios").json()) == 1


def test_spam(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    slug, h_ed = publicar(client, registrar, db)
    # La trampa oculta: responde como si nada, pero no guarda.
    assert comentar(client, slug, sitio_web="http://spam.example")["estado"] == "pendiente"
    # Muchos enlaces: va a spam (y al que lo manda se le dice lo mismo que a todos).
    enlaces = "Mira https://a.example https://b.example https://c.example"
    assert comentar(client, slug, correo="bot@example.com", contenido=enlaces)["estado"] == "pendiente"
    conteo = client.get(f"{API}/panel/comentarios?estado=spam", headers=h_ed).json()["conteo"]
    assert conteo == {"pendiente": 0, "aprobado": 0, "spam": 1}
    # Marcado como spam: lo siguiente desde la misma conexión va directo a spam.
    comentar(client, slug, correo="otro@example.com", contenido="Hola de nuevo")
    assert client.get(f"{API}/panel/comentarios", headers=h_ed).json()["conteo"]["spam"] == 2


def test_limite_y_validacion(client: TestClient, registrar: Callable[..., dict], db: Session, monkeypatch) -> None:
    slug, _ = publicar(client, registrar, db)
    url = f"{API}/blog/articulos/{slug}/comentarios"
    assert client.post(url, json={"nombre": "L", "correo": "x", "contenido": ""}).status_code == 422
    assert client.post(f"{API}/blog/articulos/no-existe/comentarios", json={
        "nombre": "Lucía", "correo": "l@example.com", "contenido": "Hola"}).status_code == 404  # fmt: skip
    monkeypatch.setattr(settings, "MAX_COMENTARIOS_POR_HORA", 2)
    comentar(client, slug)
    comentar(client, slug)
    r = client.post(url, json={"nombre": "Lucía", "correo": "l@example.com", "contenido": "Hola"})
    assert r.status_code == 429


def test_solo_quien_modera(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h_red = dar_rol(db, registrar("red@example.com", "Rosa"), REDACTOR)
    assert client.get(f"{API}/panel/comentarios", headers=h_red).status_code == 403
    assert client.get(f"{API}/panel/resumen", headers=h_red).json()["comentarios_pendientes"] is None
    assert client.get(f"{API}/panel/comentarios").status_code == 401
