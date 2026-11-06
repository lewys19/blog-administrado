import io
from collections.abc import Callable, Generator
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy.orm import Session

from app.almacen import AlmacenLocal, obtener_almacen
from app.main import app
from tests.conftest import ADMINISTRADOR, EDITOR, INVITADO, REDACTOR, dar_rol

PANEL = "/api/v1/panel"
BLOG = "/api/v1/blog"
PYTHON = 2  # categoría sembrada por la migración 0002


@pytest.fixture(autouse=True)
def carpeta_imagenes(tmp_path: Path) -> Generator[Path, None, None]:
    app.dependency_overrides[obtener_almacen] = lambda: AlmacenLocal(str(tmp_path))
    yield tmp_path
    app.dependency_overrides.pop(obtener_almacen, None)


def articulo(**cambios: object) -> dict:
    datos: dict = {
        "titulo": "Cómo usar FastAPI con PostgreSQL",
        "resumen": "Una API real paso a paso.",
        "contenido": "## Instalación\n\nPrimero instala **FastAPI**.\n\n```python\nprint('hola')\n```",
        "categoria_id": PYTHON,
        "etiquetas": ["FastAPI", "PostgreSQL"],
    }
    datos.update(cambios)
    return datos


def test_redactor_escribe_y_editor_publica(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h_red = dar_rol(db, registrar("red@example.com", "Rosa Redactora"), REDACTOR)
    h_ed = dar_rol(db, registrar("ed@example.com", "Eduardo"), EDITOR)

    r = client.post(f"{PANEL}/articulos", json=articulo(), headers=h_red)
    assert r.status_code == 201, r.text
    a = r.json()
    assert (a["slug"], a["estado"], a["etiquetas"]) == ("como-usar-fastapi-con-postgresql", "borrador", ["FastAPI", "PostgreSQL"])
    # El Redactor no publica: lo envía a revisión.
    assert client.put(f"{PANEL}/articulos/{a['id']}", json=articulo(estado="publicado"), headers=h_red).status_code == 403
    assert client.put(f"{PANEL}/articulos/{a['id']}", json=articulo(estado="revision"), headers=h_red).json()["estado"] == "revision"
    assert client.get(f"{BLOG}/articulos/{a['slug']}").status_code == 404  # aún no es público

    r = client.put(f"{PANEL}/articulos/{a['id']}", json=articulo(estado="publicado", destacado=True), headers=h_ed)
    assert r.status_code == 200 and r.json()["publicado_en"]
    publico = client.get(f"{BLOG}/articulos/{a['slug']}").json()
    assert publico["autor"]["username"] == "rosa-redactora" and publico["destacado"] is True
    assert '<h2 id="instalacion">' in publico["contenido_html"] and 'class="codigo"' in publico["contenido_html"]
    assert publico["meta_descripcion"] == "Una API real paso a paso."  # sin meta propia: el resumen
    # Ya publicado, el Redactor ya no lo cambia.
    assert client.put(f"{PANEL}/articulos/{a['id']}", json=articulo(titulo="Otro"), headers=h_red).status_code == 403


def test_el_html_se_limpia(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), EDITOR)
    malo = "Hola <script>alert(1)</script> <img src=x onerror=alert(1)> [clic](javascript:alert(1))"
    a = client.post(f"{PANEL}/articulos", json=articulo(contenido=malo, estado="publicado"), headers=h).json()
    html = client.get(f"{BLOG}/articulos/{a['slug']}").json()["contenido_html"]
    assert "<script" not in html and "onerror" not in html and "javascript:" not in html


def test_programado_sale_en_su_fecha(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), EDITOR)
    futuro = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    assert client.post(f"{PANEL}/articulos", json=articulo(estado="programado"), headers=h).status_code == 400
    a = client.post(f"{PANEL}/articulos", json=articulo(estado="programado", publicado_en=futuro), headers=h).json()
    assert client.get(f"{BLOG}/articulos/{a['slug']}").status_code == 404
    from app.models import Articulo

    db.get(Articulo, a["id"]).publicado_en = datetime.now(UTC) - timedelta(minutes=1)  # type: ignore[union-attr]
    db.commit()
    assert client.get(f"{BLOG}/articulos/{a['slug']}").status_code == 200


def test_slug_unico_y_busqueda_en_espanol(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), EDITOR)
    uno = client.post(f"{PANEL}/articulos", json=articulo(estado="publicado"), headers=h).json()
    dos = client.post(f"{PANEL}/articulos", json=articulo(estado="publicado", contenido="Aprende a programar pruebas."), headers=h).json()
    assert dos["slug"] == "como-usar-fastapi-con-postgresql-2"
    # «programación» encuentra «programar» (raíz en español).
    r = client.get(f"{BLOG}/articulos", params={"q": "programación"}).json()
    assert [x["slug"] for x in r["articulos"]] == [dos["slug"]]
    assert client.get(f"{BLOG}/articulos", params={"etiqueta": "fastapi"}).json()["total"] == 2
    assert client.get(f"{BLOG}/articulos", params={"categoria": "python"}).json()["total"] == 2
    rel = client.get(f"{BLOG}/articulos/{uno['slug']}").json()["relacionados"]
    assert [x["slug"] for x in rel] == [dos["slug"]]
    # Si no hay suficientes del mismo tema, se completa con los más recientes.
    tres = client.post(
        f"{PANEL}/articulos", json=articulo(titulo="Otro tema", categoria_id=None, etiquetas=[], estado="publicado"), headers=h
    ).json()
    rel = client.get(f"{BLOG}/articulos/{uno['slug']}").json()["relacionados"]
    assert [x["slug"] for x in rel] == [dos["slug"], tres["slug"]]


def test_portada_se_recorta_para_redes(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), EDITOR)
    a = client.post(f"{PANEL}/articulos", json=articulo(), headers=h).json()
    imagen = io.BytesIO()
    Image.new("RGB", (2000, 2000), "teal").save(imagen, "PNG")
    r = client.put(f"{PANEL}/articulos/{a['id']}/imagen", files={"foto": ("p.png", imagen.getvalue(), "image/png")}, headers=h)
    assert r.status_code == 200 and r.json()["imagen"].startswith("/media/articulos/")


def test_imagen_en_el_texto(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), EDITOR)
    imagen = io.BytesIO()
    Image.new("RGB", (2000, 1000), "teal").save(imagen, "PNG")
    r = client.post(f"{PANEL}/imagenes", files={"foto": ("p.png", imagen.getvalue(), "image/png")}, headers=h)
    assert r.status_code == 201 and r.json()["url"].startswith("/media/contenido/")
    # La dirección relativa sobrevive a la limpieza del HTML al mostrarse en el artículo.
    vista = client.post(f"{PANEL}/articulos/vista-previa", json={"contenido": f"![Foto]({r.json()['url']})"}, headers=h)
    assert f'src="{r.json()["url"]}"' in vista.json()["html"]


def test_imagen_en_el_texto_exige_sesion_y_foto_real(
    client: TestClient, registrar: Callable[..., dict], db: Session
) -> None:
    archivo = {"foto": ("p.png", b"esto no es una imagen", "image/png")}
    assert client.post(f"{PANEL}/imagenes", files=archivo).status_code == 401
    sin_rol = dar_rol(db, registrar("lector@example.com", "Lector"), None)
    assert client.post(f"{PANEL}/imagenes", files=archivo, headers=sin_rol).status_code == 403
    h = dar_rol(db, registrar("ed@example.com", "Ed"), EDITOR)
    assert client.post(f"{PANEL}/imagenes", files=archivo, headers=h).status_code == 415


def test_cambiar_de_publicado_a_revision_saca_del_blog(
    client: TestClient, registrar: Callable[..., dict], db: Session
) -> None:
    h = dar_rol(db, registrar(), EDITOR)
    a = client.post(f"{PANEL}/articulos", json=articulo(estado="publicado"), headers=h).json()
    assert client.get(f"{BLOG}/articulos/{a['slug']}").status_code == 200
    r = client.put(f"{PANEL}/articulos/{a['id']}", json=articulo(estado="revision"), headers=h)
    assert r.status_code == 200 and r.json()["estado"] == "revision"
    assert client.get(f"{BLOG}/articulos/{a['slug']}").status_code == 404


def test_markdown_conserva_h1(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), EDITOR)
    r = client.post(f"{PANEL}/articulos/vista-previa", json={"contenido": "# Grande"}, headers=h)
    assert "<h1" in r.json()["html"]


def test_invitado_y_lector(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    lector = registrar("lector@example.com", "Lector")
    assert client.post(f"{PANEL}/articulos", json=articulo(), headers={"Authorization": f"Bearer {lector['token_acceso']}"}).status_code == 403
    h_inv = dar_rol(db, registrar("inv@example.com", "Invitada"), INVITADO)
    h_ed = dar_rol(db, registrar("ed@example.com", "Ed"), EDITOR)
    propio = client.post(f"{PANEL}/articulos", json=articulo(), headers=h_inv).json()
    ajeno = client.post(f"{PANEL}/articulos", json=articulo(titulo="Del editor"), headers=h_ed).json()
    lista = client.get(f"{PANEL}/articulos", headers=h_inv).json()
    assert [x["id"] for x in lista["articulos"]] == [propio["id"]]  # solo ve los suyos
    assert client.get(f"{PANEL}/articulos/{ajeno['id']}", headers=h_inv).status_code == 403
    assert client.get(f"{PANEL}/articulos", headers=h_ed).json()["total"] == 2


def test_vista_previa(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), REDACTOR)
    r = client.post(f"{PANEL}/articulos/vista-previa", json={"contenido": "# Hola\n\n" + "palabra " * 600}, headers=h).json()
    assert r["html"].startswith('<h1 id="hola">') and r["minutos_lectura"] == 3


def test_guias_separadas_de_noticias(client: TestClient, db: Session, registrar) -> None:  # noqa: ANN001
    cab = dar_rol(db, registrar(), ADMINISTRADOR)
    base = {"contenido": "Texto", "estado": "publicado"}
    client.post("/api/v1/panel/articulos", json={**base, "titulo": "Novedades de Python 3.15"}, headers=cab)
    r = client.post(
        "/api/v1/panel/articulos", json={**base, "titulo": "Django con Bootstrap paso a paso", "tipo": "guia"}, headers=cab
    )
    assert r.status_code == 201, r.text
    assert r.json()["tipo"] == "guia"
    assert r.json()["tema"]["slug"] == "otros"  # sin tema elegido va a «Otros»

    temas = {t["slug"]: t["id"] for t in client.get("/api/v1/blog/temas-guia").json()}
    assert list(temas) == ["python", "backend", "django", "otros"]
    r = client.post(
        "/api/v1/panel/articulos",
        json={**base, "titulo": "Instalar Django con Python", "tipo": "guia", "tema_id": temas["django"]},
        headers=cab,
    )
    assert r.json()["tema"]["slug"] == "django"
    de_django = client.get("/api/v1/blog/articulos?tema=django").json()
    assert [a["titulo"] for a in de_django["articulos"]] == ["Instalar Django con Python"]

    guias = client.get("/api/v1/blog/articulos?tipo=guia").json()
    noticias = client.get("/api/v1/blog/articulos?tipo=noticia").json()
    assert sorted(a["titulo"] for a in guias["articulos"]) == ["Django con Bootstrap paso a paso", "Instalar Django con Python"]
    assert [a["titulo"] for a in noticias["articulos"]] == ["Novedades de Python 3.15"]
    assert client.get("/api/v1/blog/articulos").json()["total"] == 3  # sin filtro: todo
    assert {e["tipo"] for e in client.get("/api/v1/blog/mapa").json()} == {"guia", "noticia"}


def test_colaborador_publica_sus_guias(client: TestClient, registrar) -> None:  # noqa: ANN001
    sesion = registrar()  # registrarse da el rol Colaborador
    cab = {"Authorization": f"Bearer {sesion['token_acceso']}"}
    guia = {"titulo": "Levantar Django en Docker", "contenido": "Paso 1", "tipo": "guia", "estado": "publicado"}

    r = client.post(f"{PANEL}/articulos", json=guia, headers=cab)
    assert r.status_code == 201, r.text  # se publica sola
    assert client.get(f"{BLOG}/articulos?tipo=guia").json()["total"] == 1

    # La puede corregir aunque ya esté publicada.
    r2 = client.put(f"{PANEL}/articulos/{r.json()['id']}", json={**guia, "contenido": "Paso 1 y 2"}, headers=cab)
    assert r2.status_code == 200, r2.text

    # Pero no escribe artículos del blog ni destaca.
    blog = {**guia, "tipo": "noticia", "titulo": "Opinión sobre IA"}
    assert client.post(f"{PANEL}/articulos", json=blog, headers=cab).status_code == 403
    assert client.post(f"{PANEL}/articulos", json={**guia, "destacado": True}, headers=cab).status_code == 403
