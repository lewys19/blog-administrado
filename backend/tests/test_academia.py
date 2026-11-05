import io
from collections.abc import Callable
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy.orm import Session

from tests.conftest import ADMINISTRADOR, EDITOR, dar_rol
from tests.test_articulos import carpeta_imagenes  # noqa: F401 (fixture)

PANEL = "/api/v1/panel/academia"
PUBLICA = "/api/v1/academia"


def curso(**cambios: object) -> dict:
    datos: dict = {
        "categoria_id": 2,
        "titulo": "Curso Completo de React",
        "descripcion": "Aprende desde cero y crea aplicaciones modernas.",
        "temario": "Componentes\n\n  Hooks  \nRutas",
        "nivel": "principiante",
        "horas": 24,
        "precio_anterior": "10",
        "precio": "8",
        "publicado": True,
    }
    return datos | cambios


def test_categorias_iniciales_y_gestion(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), ADMINISTRADOR)
    nombres = [c["nombre"] for c in client.get(f"{PUBLICA}/categorias").json()]
    assert nombres[0] == "Inteligencia Artificial" and nombres[-1] == "Matemáticas" and len(nombres) == 8
    datos = client.post(f"{PANEL}/categorias", json={"nombre": "Bases de Datos", "orden": 9}, headers=h).json()
    assert datos["slug"] == "bases-de-datos"
    assert client.post(f"{PANEL}/categorias", json={"nombre": "bases de datos"}, headers=h).status_code == 409
    # Con cursos no se borra; sin cursos, sí.
    c = client.post(f"{PANEL}/cursos", json=curso(categoria_id=datos["id"]), headers=h).json()
    r = client.delete(f"{PANEL}/categorias/{datos['id']}", headers=h)
    assert r.status_code == 409 and "1 curso" in r.json()["detail"]
    client.delete(f"{PANEL}/cursos/{c['id']}", headers=h)
    assert client.delete(f"{PANEL}/categorias/{datos['id']}", headers=h).status_code == 204


def test_solo_se_ven_los_cursos_publicados(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), ADMINISTRADOR)
    c = client.post(f"{PANEL}/cursos", json=curso(publicado=False), headers=h).json()
    assert c["slug"] == "curso-completo-de-react" and c["temario"] == ["Componentes", "Hooks", "Rutas"]
    assert client.get(f"{PUBLICA}/cursos").json()["total"] == 0
    assert client.get(f"{PUBLICA}/cursos/{c['slug']}").status_code == 404

    client.put(f"{PANEL}/cursos/{c['id']}", json=curso(destacado=True), headers=h)
    visto = client.get(f"{PUBLICA}/cursos/{c['slug']}").json()
    assert (visto["precio_anterior"], visto["precio"]) == (10, 8)
    assert visto["categoria"] == {"nombre": "Programación", "slug": "programacion"}
    assert client.get(f"{PUBLICA}/cursos", params={"categoria": "programacion"}).json()["total"] == 1
    assert client.get(f"{PUBLICA}/cursos", params={"categoria": "linux"}).json()["total"] == 0
    assert client.get(f"{PUBLICA}/cursos", params={"destacados": True}).json()["total"] == 1
    assert next(x for x in client.get(f"{PUBLICA}/categorias").json() if x["slug"] == "programacion")["cursos"] == 1


def test_precios_y_titulo_repetido(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), ADMINISTRADOR)
    assert client.post(f"{PANEL}/cursos", json=curso(precio_anterior="8"), headers=h).status_code == 422
    assert client.post(f"{PANEL}/cursos", json=curso(precio="-1", precio_anterior=None), headers=h).status_code == 422
    assert client.post(f"{PANEL}/cursos", json=curso(categoria_id=999), headers=h).status_code == 404
    client.post(f"{PANEL}/cursos", json=curso(precio_anterior=None), headers=h)
    otro = client.post(f"{PANEL}/cursos", json=curso(), headers=h).json()
    assert otro["slug"] == "curso-completo-de-react-2"


def test_curso_gratis_y_enlace(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), ADMINISTRADOR)
    drive = "https://drive.google.com/drive/folders/abc"
    gratis = curso(titulo="Git gratis", precio="0", precio_anterior=None)
    r = client.post(f"{PANEL}/cursos", json=gratis, headers=h)
    assert r.status_code == 422 and "enlace" in r.json()["detail"][0]["msg"]
    assert client.post(f"{PANEL}/cursos", json=gratis | {"enlace": "javascript:alert(1)"}, headers=h).status_code == 422
    assert client.post(f"{PANEL}/cursos", json=gratis | {"enlace": drive}, headers=h).status_code == 201
    assert client.get(f"{PUBLICA}/cursos/git-gratis").json()["enlace"] == drive
    # El enlace de un curso de pago lo ve el panel, pero nunca el público.
    pago = client.post(f"{PANEL}/cursos", json=curso(enlace=drive), headers=h).json()
    assert pago["enlace"] == drive
    assert client.get(f"{PUBLICA}/cursos/{pago['slug']}").json()["enlace"] is None
    assert next(c for c in client.get(f"{PUBLICA}/cursos").json()["cursos"] if c["slug"] == pago["slug"])["enlace"] is None


def test_portada(
    client: TestClient,
    registrar: Callable[..., dict],
    db: Session,
    carpeta_imagenes: Path,  # noqa: F811
) -> None:
    h = dar_rol(db, registrar(), ADMINISTRADOR)
    c = client.post(f"{PANEL}/cursos", json=curso(), headers=h).json()
    imagen = io.BytesIO()
    Image.new("RGB", (2000, 2000), "teal").save(imagen, "PNG")
    r = client.put(
        f"{PANEL}/cursos/{c['id']}/portada", files={"foto": ("a.png", imagen.getvalue(), "image/png")}, headers=h
    )
    assert r.status_code == 200 and r.json()["portada"].endswith(".webp")
    archivo = carpeta_imagenes / r.json()["portada"].removeprefix("/media/")
    assert Image.open(archivo).size == (1200, 630)
    client.delete(f"{PANEL}/cursos/{c['id']}", headers=h)
    assert not archivo.exists()


def test_sin_permiso_no_se_gestiona(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), EDITOR)
    assert client.get(f"{PANEL}/cursos", headers=h).status_code == 403
    assert client.post(f"{PANEL}/categorias", json={"nombre": "Nueva"}, headers=h).status_code == 403


def test_busqueda_y_paginas(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), ADMINISTRADOR)
    client.post(f"{PANEL}/cursos", json=curso(titulo="Introducción a Python"), headers=h)
    client.post(f"{PANEL}/cursos", json=curso(titulo="Docker", temario="Redes\nVolúmenes al 100%"), headers=h)
    client.post(f"{PANEL}/cursos", json=curso(titulo="Oculto en borrador", publicado=False), headers=h)

    def buscar(q: str) -> list[str]:
        return [c["titulo"] for c in client.get(f"{PUBLICA}/cursos", params={"q": q}).json()["cursos"]]

    assert buscar("introduccion") == ["Introducción a Python"]  # sin tilde y sin mayúscula
    assert buscar("VOLÚMENES") == ["Docker"]  # también busca en el temario
    assert buscar("100%") == ["Docker"] and buscar("%") == ["Docker"]  # % es texto, no comodín
    assert buscar("borrador") == []

    uno = client.get(f"{PUBLICA}/cursos", params={"por_pagina": 1, "pagina": 2}).json()
    assert uno["total"] == 2 and uno["pagina"] == 2 and len(uno["cursos"]) == 1


def test_lateral(
    client: TestClient,
    registrar: Callable[..., dict],
    db: Session,
    carpeta_imagenes: Path,  # noqa: F811
) -> None:
    h = dar_rol(db, registrar(), ADMINISTRADOR)
    datos = client.get(f"{PUBLICA}/lateral").json()
    assert [e["nombre"] for e in datos["etiquetas"] if e["grupo"] == "manuales"] == ["Angular", "SQL", "MongoDB"]
    assert datos["anuncios"] == [] and datos["curso"] is None

    # Etiquetas: se agregan y se quitan; repetida en el mismo grupo no.
    e = client.post(f"{PANEL}/etiquetas", json={"nombre": "Vue", "grupo": "cursos", "orden": 9}, headers=h).json()
    assert client.post(f"{PANEL}/etiquetas", json={"nombre": "vue", "grupo": "cursos"}, headers=h).status_code == 409
    assert client.post(f"{PANEL}/etiquetas", json={"nombre": "vue", "grupo": "manuales"}, headers=h).status_code == 201
    assert client.delete(f"{PANEL}/etiquetas/{e['id']}", headers=h).status_code == 204

    # Sin anuncios sale un curso propio de pago y destacado; uno gratis no.
    client.post(
        f"{PANEL}/cursos",
        json=curso(titulo="Gratis", precio="0", precio_anterior=None, enlace="https://a.com/x", destacado=True),
        headers=h,
    )
    assert client.get(f"{PUBLICA}/lateral").json()["curso"] is None
    client.post(f"{PANEL}/cursos", json=curso(destacado=True), headers=h)
    assert client.get(f"{PUBLICA}/lateral").json()["curso"]["titulo"] == "Curso Completo de React"

    # Con un anuncio activo sale el anuncio, no el curso; desactivado vuelve el curso.
    anuncio = {"titulo": "Hosting barato", "enlace": "https://ejemplo.com"}
    assert client.post(f"{PANEL}/anuncios", json=anuncio | {"enlace": "http://x.com"}, headers=h).status_code == 422
    a = client.post(f"{PANEL}/anuncios", json=anuncio, headers=h).json()
    imagen = io.BytesIO()
    Image.new("RGB", (900, 900), "teal").save(imagen, "PNG")
    r = client.put(
        f"{PANEL}/anuncios/{a['id']}/imagen", files={"foto": ("a.png", imagen.getvalue(), "image/png")}, headers=h
    )
    archivo = carpeta_imagenes / r.json()["imagen"].removeprefix("/media/")
    assert Image.open(archivo).size == (600, 500)
    datos = client.get(f"{PUBLICA}/lateral").json()
    assert [x["titulo"] for x in datos["anuncios"]] == ["Hosting barato"] and datos["curso"] is None
    client.put(f"{PANEL}/anuncios/{a['id']}", json=anuncio | {"activo": False}, headers=h)
    assert client.get(f"{PUBLICA}/lateral").json()["curso"] is not None
    client.delete(f"{PANEL}/anuncios/{a['id']}", headers=h)
    assert not archivo.exists()


def test_manuales_separatas_y_sistemas(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), ADMINISTRADOR)
    client.post(f"{PANEL}/cursos", json=curso(), headers=h)
    client.post(f"{PANEL}/cursos", json=curso(tipo="manual", titulo="Manual de SQL"), headers=h)
    pos = client.post(
        f"{PANEL}/cursos",
        json=curso(
            tipo="sistema",
            titulo="Sistema POS",
            tecnologias="Python, FastAPI , ,PostgreSQL",
            instalacion="1. Clona el repositorio\n2. Levanta Docker",
        ),
        headers=h,
    ).json()
    assert pos["tecnologias"] == ["Python", "FastAPI", "PostgreSQL"]

    def titulos(tipo: str) -> list[str]:
        return [c["titulo"] for c in client.get(f"{PUBLICA}/cursos", params={"tipo": tipo}).json()["cursos"]]

    assert titulos("manual") == ["Manual de SQL"] and titulos("sistema") == ["Sistema POS"] and titulos("separata") == []
    assert client.get(f"{PUBLICA}/cursos").json()["total"] == 3  # sin tipo: todos (lo usa el sitemap)
    assert len(client.get(f"{PANEL}/cursos", params={"tipo": "sistema"}, headers=h).json()) == 1
    visto = client.get(f"{PUBLICA}/cursos/sistema-pos").json()
    assert visto["tipo"] == "sistema" and visto["instalacion"].startswith("1. Clona")
    sistemas = [e["nombre"] for e in client.get(f"{PUBLICA}/lateral").json()["etiquetas"] if e["grupo"] == "sistemas"]
    assert sistemas == ["POS", "CRM", "Automatización"]
