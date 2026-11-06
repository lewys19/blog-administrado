from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services import fuentes
from tests.conftest import ADMINISTRADOR, EDITOR, dar_rol
from tests.test_articulos import carpeta_imagenes  # noqa: F401 (fixture)

PANEL = "/api/v1/panel"
RSS = b"""<?xml version="1.0"?><rss version="2.0"><channel><title>Sitio</title>
<item><title>Sale Python 4 &amp; algo</title><link>https://ejemplo.com/python-4</link>
<description>&lt;p&gt;Resumen &lt;b&gt;corto&lt;/b&gt; &lt;script&gt;alert(1)&lt;/script&gt;&lt;/p&gt;</description>
<pubDate>Thu, 05 Nov 2026 10:00:00 GMT</pubDate></item>
<item><title>Enlace raro</title><link>javascript:alert(1)</link></item>
</channel></rss>"""


@pytest.fixture()
def rss(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(fuentes, "_descargar", lambda _url: RSS)


def _admin(db: Session, registrar: Callable[..., dict]) -> dict:
    return dar_rol(db, registrar(), ADMINISTRADOR)


def test_trae_una_sola_vez_y_limpia(
    client: TestClient, registrar: Callable[..., dict], db: Session, rss: None
) -> None:
    h = _admin(db, registrar)
    assert len(client.get(f"{PANEL}/fuentes", headers=h).json()) == 11
    r = client.post(f"{PANEL}/fuentes/actualizar", headers=h).json()
    assert r == {"leidas": 11, "con_error": 0, "nuevas": 1}  # la misma noticia en 11 fuentes, sin el enlace raro
    assert client.post(f"{PANEL}/fuentes/actualizar", headers=h).json()["nuevas"] == 0
    n = client.get(f"{PANEL}/noticias", headers=h).json()["noticias"][0]
    assert n["titulo"] == "Sale Python 4 & algo"
    assert "<" not in n["extracto"] and "alert" not in n["extracto"]


def test_borrador_enlaza_la_fuente_y_no_se_publica(
    client: TestClient, registrar: Callable[..., dict], db: Session, rss: None
) -> None:
    h = _admin(db, registrar)
    client.post(f"{PANEL}/fuentes/actualizar", headers=h)
    n = client.get(f"{PANEL}/noticias", headers=h).json()["noticias"][0]
    r = client.post(f"{PANEL}/noticias/{n['id']}/borrador", headers=h)
    assert r.status_code == 201
    articulo = client.get(f"{PANEL}/articulos/{r.json()['articulo_id']}", headers=h).json()
    assert articulo["estado"] == "borrador"
    assert (articulo["fuente_nombre"], articulo["fuente_url"]) == (n["fuente"], "https://ejemplo.com/python-4")
    otra = client.post(f"{PANEL}/noticias/{n['id']}/borrador", headers=h).json()
    assert otra["articulo_id"] == r.json()["articulo_id"]  # no duplica
    assert client.get(f"{PANEL}/noticias", headers=h).json()["total"] == 0


def test_descartar(client: TestClient, registrar: Callable[..., dict], db: Session, rss: None) -> None:
    h = _admin(db, registrar)
    client.post(f"{PANEL}/fuentes/actualizar", headers=h)
    n = client.get(f"{PANEL}/noticias", headers=h).json()["noticias"][0]
    assert client.post(f"{PANEL}/noticias/{n['id']}/descartar", headers=h).status_code == 204
    assert client.get(f"{PANEL}/noticias?estado=descartada", headers=h).json()["total"] == 1


def test_una_fuente_caida_no_detiene_las_demas(
    client: TestClient, registrar: Callable[..., dict], db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    def falla_una(url: str) -> bytes:
        if "xataka" in url:
            raise ValueError("El sitio respondió 503.")
        return RSS

    monkeypatch.setattr(fuentes, "_descargar", falla_una)
    h = _admin(db, registrar)
    r = client.post(f"{PANEL}/fuentes/actualizar", headers=h).json()
    assert (r["leidas"], r["con_error"]) == (10, 1)
    lista = client.get(f"{PANEL}/fuentes", headers=h).json()
    assert next(f for f in lista if f["nombre"] == "Xataka")["ultimo_error"] == "El sitio respondió 503."


def test_gestion_de_fuentes(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = _admin(db, registrar)
    nueva = {"nombre": "Mi sitio", "url": "https://misitio.com/rss"}
    r = client.post(f"{PANEL}/fuentes", json=nueva, headers=h)
    assert r.status_code == 201
    assert client.post(f"{PANEL}/fuentes", json=nueva, headers=h).status_code == 409
    assert client.post(f"{PANEL}/fuentes", json=nueva | {"url": "http://x.com/rss"}, headers=h).status_code == 422
    fid = r.json()["id"]
    assert client.put(f"{PANEL}/fuentes/{fid}", json=nueva | {"activa": False}, headers=h).json()["activa"] is False
    assert client.delete(f"{PANEL}/fuentes/{fid}", headers=h).status_code == 204


def test_permisos(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    assert client.get(f"{PANEL}/fuentes").status_code == 401
    editor = dar_rol(db, registrar(), EDITOR)
    assert client.get(f"{PANEL}/fuentes", headers=editor).status_code == 403
    assert client.post(f"{PANEL}/fuentes/actualizar", headers=editor).status_code == 403


@pytest.mark.parametrize(
    "url", ["http://ejemplo.com/rss", "https://127.0.0.1/rss", "https://10.0.0.5/rss", "https://169.254.169.254/x"]
)
def test_no_lee_la_red_interna(url: str) -> None:
    with pytest.raises(ValueError):
        fuentes._exigir_publica(url)


def test_filtro_por_palabras() -> None:
    assert fuentes._coincide("", "cualquier cosa")
    assert fuentes._coincide("IA, Python", "Nueva versión de python 4")
    assert fuentes._coincide("Programación", "Lenguajes de PROGRAMACION")
    assert not fuentes._coincide("IA", "La historia de la informática")


def test_reconoce_la_misma_noticia() -> None:
    vista = [fuentes._terminos("OpenAI lanza GPT-6 con nuevas funciones para empresas")]
    assert fuentes._repetida(fuentes._terminos("OpenAI lanza GPT-6 con nuevas funciones para las empresas"), vista)
    assert not fuentes._repetida(fuentes._terminos("Google presenta Gemini con funciones para empresas"), vista)


def test_no_repite_entre_sitios_y_aplica_filtro(
    client: TestClient, registrar: Callable[..., dict], db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    def rss_de(url: str) -> bytes:
        item = "<item><title>{}</title><link>https://{}.com/n</link></item>"
        cuerpo = item.format("OpenAI lanza un modelo nuevo para empresas", url.split("/")[2])
        return f"<rss version='2.0'><channel>{cuerpo}</channel></rss>".encode()

    monkeypatch.setattr(fuentes, "_descargar", rss_de)
    h = _admin(db, registrar)
    assert client.post(f"{PANEL}/fuentes/actualizar", headers=h).json()["nuevas"] == 1

    lista = client.get(f"{PANEL}/fuentes", headers=h).json()
    for f in lista:
        datos = {"nombre": f["nombre"], "url": f["url"], "palabras": "cocina"}
        client.put(f"{PANEL}/fuentes/{f['id']}", json=datos, headers=h)
    db.execute(text("DELETE FROM noticias_fuente"))
    db.commit()
    assert client.post(f"{PANEL}/fuentes/actualizar", headers=h).json()["nuevas"] == 0


def test_limpia_lo_viejo_sin_tocar_lo_usado(
    client: TestClient, registrar: Callable[..., dict], db: Session, rss: None
) -> None:
    h = _admin(db, registrar)
    db.execute(
        text(
            "INSERT INTO noticias_fuente (fuente_id, titulo, enlace, estado, creado_en) VALUES "
            "(1, 'Vieja', 'https://a.com/1', 'nueva', now() - interval '40 days'),"
            "(1, 'Usada', 'https://a.com/2', 'usada', now() - interval '40 days'),"
            "(1, 'Reciente', 'https://a.com/3', 'nueva', now())"
        )
    )
    db.commit()
    client.post(f"{PANEL}/fuentes/actualizar", headers=h)
    titulos = set(db.scalars(text("SELECT titulo FROM noticias_fuente")).all())
    assert "Vieja" not in titulos and {"Usada", "Reciente"} <= titulos


def test_lote_y_aviso(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = _admin(db, registrar)
    db.execute(
        text(
            "INSERT INTO noticias_fuente (fuente_id, titulo, enlace) VALUES "
            "(1, 'Primera noticia', 'https://a.com/1'), (1, 'Segunda noticia', 'https://a.com/2'),"
            "(1, 'Tercera noticia', 'https://a.com/3')"
        )
    )
    db.execute(text("UPDATE fuentes SET ultimo_error = 'caída' WHERE id = 1"))
    db.commit()
    assert client.get(f"{PANEL}/fuentes/aviso", headers=h).json() == {"nuevas": 3, "con_error": 1}
    ids = [n["id"] for n in client.get(f"{PANEL}/noticias", headers=h).json()["noticias"]]
    r = client.post(f"{PANEL}/noticias/lote", json={"ids": ids[:2], "accion": "borrador"}, headers=h)
    assert r.json() == {"procesadas": 2}
    client.post(f"{PANEL}/noticias/lote", json={"ids": ids[2:], "accion": "descartar"}, headers=h)
    assert client.get(f"{PANEL}/fuentes/aviso", headers=h).json()["nuevas"] == 0
    assert client.get(f"{PANEL}/noticias?estado=usada", headers=h).json()["total"] == 2


def test_fuente_visible_en_el_articulo(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = _admin(db, registrar)
    datos = {
        "titulo": "Noticia con fuente",
        "contenido": "Texto.",
        "etiquetas": [],
        "estado": "publicado",
        "fuente_nombre": "Xataka",
        "fuente_url": "https://xataka.com/n",
    }
    a = client.post(f"{PANEL}/articulos", json=datos, headers=h).json()
    publico = client.get(f"/api/v1/blog/articulos/{a['slug']}").json()
    assert (publico["fuente_nombre"], publico["fuente_url"]) == ("Xataka", "https://xataka.com/n")
    r = client.post(f"{PANEL}/articulos", json=datos | {"fuente_url": "javascript:alert(1)"}, headers=h)
    assert r.status_code == 422
