import re
from collections.abc import Callable
from email import policy
from email.parser import BytesParser
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from tests.conftest import ADMINISTRADOR, REDACTOR, dar_rol
from tests.test_articulos import articulo

API = "/api/v1"


@pytest.fixture()
def buzon(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Callable[[], list]:
    """Sin SMTP los correos quedan como .eml en una carpeta: la prueba los lee de ahí."""
    monkeypatch.setattr(settings, "SMTP_HOST", "")
    monkeypatch.setattr(settings, "CARPETA_BUZON", str(tmp_path))
    monkeypatch.setattr(settings, "SITIO_URL", "https://blog.example")

    def leer() -> list:
        return [BytesParser(policy=policy.default).parsebytes(p.read_bytes()) for p in sorted(tmp_path.glob("*.eml"))]

    return leer


def enlace(correo, ruta: str) -> str:
    texto = correo.get_body(preferencelist=("plain",)).get_content()
    return re.search(rf"https://blog\.example{ruta}\?token=([\w-]+)", texto).group(1)  # type: ignore[union-attr]


def suscribir(client: TestClient, correo: str) -> str:
    r = client.post(f"{API}/newsletter/suscribir", json={"correo": correo})
    assert r.status_code == 200, r.text
    return r.json()["mensaje"]


def test_suscripcion_confirmacion_y_baja(client: TestClient, buzon: Callable[[], list]) -> None:
    respuesta = suscribir(client, "Ana@Example.com")
    [aviso] = buzon()
    assert aviso["To"] == "ana@example.com" and "Confirma" in aviso["Subject"]
    token = enlace(aviso, "/newsletter/confirmar")
    # Repetir enseguida no manda otro correo, y la respuesta no revela nada.
    assert suscribir(client, "ana@example.com") == respuesta and len(buzon()) == 1

    r = client.post(f"{API}/newsletter/confirmar", json={"token": token})
    assert r.status_code == 200 and "confirmada" in r.json()["mensaje"]
    # Ya confirmada: suscribirse de nuevo no escribe ni cambia nada.
    assert suscribir(client, "ana@example.com") == respuesta and len(buzon()) == 1

    assert client.post(f"{API}/newsletter/baja/{token}").status_code == 200  # un clic, desde Gmail
    assert client.post(f"{API}/newsletter/confirmar", json={"token": "no-existe"}).status_code == 404


def test_trampa_y_limite(client: TestClient, buzon: Callable[[], list], monkeypatch: pytest.MonkeyPatch) -> None:
    r = client.post(f"{API}/newsletter/suscribir", json={"correo": "bot@example.com", "sitio_web": "x"})
    assert r.status_code == 200 and buzon() == []
    monkeypatch.setattr(settings, "MAX_SUSCRIPCIONES_POR_HORA", 2)
    suscribir(client, "uno@example.com")
    suscribir(client, "dos@example.com")
    assert client.post(f"{API}/newsletter/suscribir", json={"correo": "tres@example.com"}).status_code == 429


def test_envio_de_un_articulo(
    client: TestClient, registrar: Callable[..., dict], db: Session, buzon: Callable[[], list]
) -> None:
    h_ed = dar_rol(db, registrar("ed@example.com", "Eduardo"), ADMINISTRADOR)
    a = client.post(f"{API}/panel/articulos", json=articulo(estado="publicado"), headers=h_ed).json()
    for correo in ("ana@example.com", "beto@example.com", "caro@example.com"):
        suscribir(client, correo)
    tokens = [enlace(c, "/newsletter/confirmar") for c in buzon()]
    for t in tokens[:2]:  # Caro no confirma
        client.post(f"{API}/newsletter/confirmar", json={"token": t})

    panel = client.get(f"{API}/panel/newsletter/suscriptores", headers=h_ed).json()
    assert panel["conteo"] == {"confirmado": 2, "pendiente": 1, "baja": 0, "nuevos_30d": 2}
    assert client.get(f"{API}/panel/newsletter/suscriptores.csv", headers=h_ed).text.count("@example.com") == 2

    r = client.post(f"{API}/panel/newsletter/prueba", json={"articulo_id": a["id"]}, headers=h_ed)
    assert r.status_code == 200 and buzon()[-1]["To"] == "ed@example.com"

    antes = len(buzon())
    r = client.post(f"{API}/panel/newsletter/envios", json={"articulo_id": a["id"]}, headers=h_ed)
    assert r.status_code == 202, r.text
    # El envío corre en segundo plano (en las pruebas termina antes de seguir).
    [envio] = client.get(f"{API}/panel/newsletter/envios", headers=h_ed).json()
    assert (envio["estado"], envio["total"], envio["enviados"], envio["fallidos"]) == ("enviado", 2, 2, 0)
    nuevos = buzon()[antes:]
    assert sorted(c["To"] for c in nuevos) == ["ana@example.com", "beto@example.com"]
    correo = nuevos[0]
    assert correo["Subject"] == a["titulo"] and "One-Click" in correo["List-Unsubscribe-Post"]
    assert f"https://blog.example/blog/{a['slug']}" in correo.get_body(preferencelist=("html",)).get_content()

    # Darse de baja con el enlace del correo: el siguiente envío ya no le llega.
    client.post(f"{API}/newsletter/baja", json={"token": enlace(correo, "/newsletter/baja")})
    lista = client.get(f"{API}/panel/newsletter/articulos", headers=h_ed).json()
    assert lista[0]["id"] == a["id"] and lista[0]["enviado_en"]
    client.post(f"{API}/panel/newsletter/envios", json={"articulo_id": a["id"]}, headers=h_ed)
    assert client.get(f"{API}/panel/newsletter/envios", headers=h_ed).json()[0]["total"] == 1


def test_solo_quien_gestiona(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h_red = dar_rol(db, registrar("red@example.com", "Rosa"), REDACTOR)
    assert client.get(f"{API}/panel/newsletter/suscriptores", headers=h_red).status_code == 403
    assert client.post(f"{API}/panel/newsletter/envios", json={"articulo_id": 1}, headers=h_red).status_code == 403
