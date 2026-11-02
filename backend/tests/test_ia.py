"""IA: el endpoint del borrador. Claude se reemplaza por un doble: las pruebas no gastan ni necesitan clave."""

import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services import ia
from tests.conftest import ADMINISTRADOR, INVITADO, dar_rol

API = "/api/v1/panel/ia/borrador"


class _StreamFalso:
    def __init__(self, respuesta: SimpleNamespace, pedidos: list) -> None:
        self.respuesta, self.pedidos = respuesta, pedidos

    def __call__(self, **kwargs):  # noqa: ANN204
        self.pedidos.append(kwargs)
        return self

    def __enter__(self):  # noqa: ANN204
        return self

    def __exit__(self, *args) -> None:  # noqa: ANN002
        return None

    def get_final_message(self) -> SimpleNamespace:
        return self.respuesta


def _respuesta(datos: dict | None = None, stop: str = "end_turn") -> SimpleNamespace:
    texto = json.dumps(datos or {}, ensure_ascii=False)
    return SimpleNamespace(stop_reason=stop, content=[SimpleNamespace(type="text", text=texto)])


@pytest.fixture()
def claude(monkeypatch: pytest.MonkeyPatch):  # noqa: ANN201
    """Pone una clave falsa y un cliente falso; devuelve la función para fijar la respuesta."""
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "clave-de-prueba")
    pedidos: list = []

    def fijar(respuesta: SimpleNamespace) -> list:
        falso = SimpleNamespace(beta=SimpleNamespace(messages=SimpleNamespace(stream=_StreamFalso(respuesta, pedidos))))
        monkeypatch.setattr(ia, "_cliente", lambda: falso)
        return pedidos

    return fijar


BUENO = {
    "titulo": "  Docker para principiantes  ",
    "resumen": "Qué es Docker y cómo empezar.",
    "contenido": "## Qué es\n\nUn contenedor...",
    "etiquetas": ["Docker", "docker", "devops", "x"],
}


def test_genera_borrador(client: TestClient, db: Session, registrar, claude) -> None:  # noqa: ANN001
    pedidos = claude(_respuesta(BUENO))
    cab = dar_rol(db, registrar(), ADMINISTRADOR)

    r = client.post(API, json={"tema": "Docker desde cero", "indicaciones": "Con ejemplos en Linux"}, headers=cab)

    assert r.status_code == 200, r.text
    assert r.json() == {
        "titulo": "Docker para principiantes",
        "resumen": "Qué es Docker y cómo empezar.",
        "contenido": "## Qué es\n\nUn contenedor...",
        "etiquetas": ["docker", "devops"],  # minúsculas, sin repetidas ni de 1 letra
    }
    pedido = pedidos[0]
    assert pedido["model"] == settings.IA_MODELO
    assert "Docker desde cero" in pedido["messages"][0]["content"]
    assert "Con ejemplos en Linux" in pedido["messages"][0]["content"]
    assert pedido["output_config"]["format"]["type"] == "json_schema"


def test_sin_permiso_no_puede(client: TestClient, db: Session, registrar, claude) -> None:  # noqa: ANN001
    claude(_respuesta(BUENO))
    cab = dar_rol(db, registrar(), INVITADO)  # el Invitado no trae «ia.usar»
    assert client.post(API, json={"tema": "Docker desde cero"}, headers=cab).status_code == 403


def test_sin_clave_avisa(client: TestClient, db: Session, registrar, monkeypatch: pytest.MonkeyPatch) -> None:  # noqa: ANN001
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    cab = dar_rol(db, registrar(), ADMINISTRADOR)
    r = client.post(API, json={"tema": "Docker desde cero"}, headers=cab)
    assert r.status_code == 503
    assert "ANTHROPIC_API_KEY" in r.json()["detail"]


def test_rechazo_de_la_ia(client: TestClient, db: Session, registrar, claude) -> None:  # noqa: ANN001
    claude(_respuesta(stop="refusal"))
    cab = dar_rol(db, registrar(), ADMINISTRADOR)
    assert client.post(API, json={"tema": "Docker desde cero"}, headers=cab).status_code == 422


def test_tema_muy_corto(client: TestClient, db: Session, registrar, claude) -> None:  # noqa: ANN001
    claude(_respuesta(BUENO))
    cab = dar_rol(db, registrar(), ADMINISTRADOR)
    assert client.post(API, json={"tema": "IA"}, headers=cab).status_code == 422
