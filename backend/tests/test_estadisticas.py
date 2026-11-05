from collections.abc import Callable
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.fechas import ahora
from app.models import Visita
from app.services.estadisticas import _origen, _referente
from tests.conftest import EDITOR, REDACTOR, dar_rol
from tests.test_articulos import articulo

API = "/api/v1"
CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36"
IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"


def visitar(client: TestClient, ruta: str, navegador: str = CHROME, **cabeceras: str) -> str | None:
    referente = cabeceras.pop("ref", None)
    h = {"User-Agent": navegador, "Accept-Language": "es-PE,es;q=0.9", **cabeceras}
    r = client.post(f"{API}/estadisticas/visita", json={"ruta": ruta, "referente": referente}, headers=h)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_de_donde_llegan() -> None:
    assert _referente("https://www.google.com/search?q=fastapi") == "google.com"
    assert _origen("google.com.pe") == "buscador"
    assert _origen("gemini.google.com") == "ia" and _origen("chatgpt.com") == "ia"
    assert _origen("t.co") == "redes" and _origen("l.facebook.com") == "redes"
    assert _origen("reddit.com") == "redes" and _origen("dev.to") == "otros"
    assert _origen(_referente("newsletter")) == "otros" and _origen(None) == "directo"


def test_cuenta_visitas_y_no_robots(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h_ed = dar_rol(db, registrar("ed@example.com", "Eduardo"), EDITOR)
    a = client.post(f"{API}/panel/articulos", json=articulo(estado="publicado"), headers=h_ed).json()

    assert visitar(client, f"/blog/{a['slug']}?utm=x", ref="https://www.google.com/") is not None
    assert visitar(client, f"/blog/{a['slug']}", IPHONE, **{settings.CABECERA_PAIS: "MX"}) is not None
    assert visitar(client, "/") is not None
    # No cuentan: robots, prefetch, el panel y la API.
    assert visitar(client, "/", "Googlebot/2.1 (+http://www.google.com/bot.html)") is None
    assert visitar(client, "/", "curl/8.5") is None
    assert visitar(client, "/", **{"Sec-Purpose": "prefetch"}) is None
    assert visitar(client, "/admin/articulos") is None
    assert visitar(client, "/api/v1/yo") is None

    filas = db.query(Visita).order_by(Visita.creado_en).all()
    assert len(filas) == 3
    assert all(v.ruta.startswith("/") and "?" not in v.ruta for v in filas)
    assert (filas[0].articulo_id, filas[0].origen, filas[0].referente) == (a["id"], "buscador", "google.com")
    assert (filas[0].pais, filas[0].dispositivo) == ("PE", "escritorio")  # país del idioma: sin IP real
    assert (filas[1].pais, filas[1].dispositivo, filas[1].origen) == ("MX", "movil", "directo")
    assert filas[2].articulo_id is None
    # Mismo navegador el mismo día: el mismo lector anónimo; y nunca la IP.
    assert filas[0].visitante == filas[2].visitante and len(filas[0].visitante) == 16


def test_rafaga_no_cuenta(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(settings, "MAX_VISITAS_POR_MINUTO", 3)
    resultados = [visitar(client, "/") for _ in range(5)]
    assert [r is not None for r in resultados] == [True, True, True, False, False]


def test_lectura_solo_sube_y_no_supera_el_tiempo_real(client: TestClient, db: Session) -> None:
    visita_id = visitar(client, "/")
    db.execute(update(Visita).values(creado_en=ahora() - timedelta(seconds=60)))
    db.commit()

    def leer(segundos: int, profundidad: int) -> None:
        r = client.post(f"{API}/estadisticas/lectura", json={"id": visita_id, "segundos": segundos, "profundidad": profundidad})
        assert r.status_code == 204

    leer(40, 70)
    leer(10, 20)  # un informe viejo que llega tarde no baja nada
    leer(5000, 100)  # más que lo transcurrido: se limita a ~60 s
    v = db.get(Visita, visita_id)
    db.refresh(v)
    assert 60 <= v.segundos <= 70 and v.profundidad == 100


def test_panel_estadisticas(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h_ed = dar_rol(db, registrar("ed@example.com", "Eduardo"), EDITOR)
    h_red = dar_rol(db, registrar("red@example.com", "Rosa"), REDACTOR)
    a = client.post(f"{API}/panel/articulos", json=articulo(estado="publicado"), headers=h_ed).json()
    for navegador in (CHROME, IPHONE):
        visita_id = visitar(client, f"/blog/{a['slug']}", navegador, ref="https://t.co/abc")
        db.execute(update(Visita).where(Visita.id == visita_id).values(creado_en=ahora() - timedelta(minutes=5)))
        db.commit()
        client.post(f"{API}/estadisticas/lectura", json={"id": visita_id, "segundos": 120, "profundidad": 80})
    visitar(client, "/")

    # Un Redactor no ve estadísticas ni las cifras de visitas del dashboard.
    assert client.get(f"{API}/panel/estadisticas", headers=h_red).status_code == 403
    assert client.get(f"{API}/panel/resumen", headers=h_red).json()["visitas"] is None

    e = client.get(f"{API}/panel/estadisticas?periodo=7d", headers=h_ed).json()
    assert len(e["serie"]) == 7 and e["serie"][-1]["etiqueta"] == e["hasta"]
    assert e["totales"]["visitas"] == 3 and e["totales"]["lectores"] == 2  # Chrome y iPhone
    assert e["totales"]["segundos_promedio"] == 120 and e["totales"]["profundidad_promedio"] == 80
    assert e["paises"] == [{"clave": "PE", "visitas": 3}]
    assert {c["clave"]: c["visitas"] for c in e["origenes"]} == {"redes": 2, "directo": 1}
    assert e["referentes"] == [{"clave": "t.co", "visitas": 2}]
    assert {c["clave"] for c in e["dispositivos"]} == {"escritorio", "movil"}
    assert e["articulos"][0] == {
        "id": a["id"], "titulo": a["titulo"], "slug": a["slug"],
        "visitas": 2, "segundos_promedio": 120, "profundidad_promedio": 80,
    }  # fmt: skip

    anual = client.get(f"{API}/panel/estadisticas?periodo=12m", headers=h_ed).json()
    assert len(anual["serie"]) == 12 and anual["serie"][-1]["visitas"] == 3

    r = client.get(f"{API}/panel/resumen", headers=h_ed).json()["visitas"]
    assert (r["hoy"], r["mes"], r["segundos_promedio_mes"], len(r["por_mes"])) == (3, 3, 120, 12)
    assert client.get(f"{API}/panel/estadisticas?periodo=5a", headers=h_ed).status_code == 422


def test_vistas_y_mas_leidos(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h_ed = dar_rol(db, registrar("ed@example.com", "Eduardo"), EDITOR)
    uno = client.post(f"{API}/panel/articulos", json=articulo(estado="publicado"), headers=h_ed).json()
    dos = client.post(f"{API}/panel/articulos", json=articulo(titulo="Otro tema", estado="publicado"), headers=h_ed).json()
    for navegador in (CHROME, IPHONE):
        visitar(client, f"/blog/{dos['slug']}", navegador)

    publico = client.get(f"{API}/blog/articulos/{dos['slug']}").json()
    assert publico["vistas"] == 2
    assert publico["sobre_autor"] == {"nombre": "Eduardo", "username": "eduardo", "biografia": None, "articulos": 2}
    # El más visto primero; el resto se completa con los recientes (sin vistas).
    leidos = client.get(f"{API}/blog/mas-leidos?limite=5").json()
    assert [(m["slug"], m["vistas"]) for m in leidos] == [(dos["slug"], 2), (uno["slug"], 0)]


def test_paises_publicos(client: TestClient) -> None:
    for pais in ["PE", "PE", "MX", "ES"]:
        visitar(client, "/", **{settings.CABECERA_PAIS: pais})
    datos = client.get("/api/v1/blog/paises").json()
    assert datos[0] == {"clave": "PE", "visitas": 2}
    assert {d["clave"] for d in datos} >= {"MX", "ES"}


def test_paises_del_mapa(client: TestClient) -> None:
    visitar(client, "/", **{"Accept-Language": "en"})  # sin país conocido: no entra al mapa
    for pais in ["PE", "PE", "MX", "ES", "CO", "AR", "CL", "BR"]:  # más que los 5 de la lista
        visitar(client, "/", **{settings.CABECERA_PAIS: pais})
    datos = client.get("/api/v1/blog/paises/mapa").json()
    assert datos[0] == {"clave": "PE", "visitas": 2} and len(datos) == 7
    assert all(d["clave"] for d in datos)
