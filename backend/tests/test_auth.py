from collections.abc import Callable

from fastapi.testclient import TestClient

from tests.conftest import cabeceras

API = "/api/v1"


def test_registro_ingreso_y_perfil(client: TestClient, registrar: Callable[..., dict]) -> None:
    sesion = registrar(nombre="Lewys Ramos")
    assert sesion["usuario"]["username"] == "lewys-ramos" and sesion["usuario"]["en_panel"] is True  # Colaborador
    yo = client.get(f"{API}/yo", headers=cabeceras(sesion)).json()
    assert (yo["rol"], yo["permisos"]) == ("Colaborador", ["guias.escribir"])
    r = client.post(f"{API}/auth/login", json={"email": "ANA@example.com", "contrasena": "clave-segura-1"})
    assert r.status_code == 200
    assert client.post(f"{API}/auth/registro", json={
        "email": "ana@example.com", "nombre": "Otra", "contrasena": "clave-segura-1", "acepta_terminos": True,
    }).status_code == 409  # fmt: skip


def test_refresco_rota_y_un_token_reusado_cierra_todo(client: TestClient, registrar: Callable[..., dict]) -> None:
    viejo = registrar()["token_refresco"]
    nuevo = client.post(f"{API}/auth/refresco", json={"token_refresco": viejo}).json()["token_refresco"]
    assert client.post(f"{API}/auth/refresco", json={"token_refresco": viejo}).status_code == 401
    assert client.post(f"{API}/auth/refresco", json={"token_refresco": nuevo}).status_code == 401


def test_limite_de_intentos_de_ingreso(client: TestClient, registrar: Callable[..., dict]) -> None:
    registrar()
    malo = {"email": "ana@example.com", "contrasena": "equivocada"}
    for _ in range(5):
        assert client.post(f"{API}/auth/login", json=malo).status_code == 401
    # Al sexto, ni la contraseña correcta pasa: hay que esperar.
    r = client.post(f"{API}/auth/login", json={"email": "ana@example.com", "contrasena": "clave-segura-1"})
    assert r.status_code == 429 and "Espera" in r.json()["detail"]


def test_cambiar_datos_y_username(client: TestClient, registrar: Callable[..., dict]) -> None:
    h = cabeceras(registrar())
    r = client.patch(f"{API}/yo", json={"username": "@Lewys", "biografia": "Escribo de FastAPI."}, headers=h)
    assert r.status_code == 200 and r.json()["username"] == "lewys"
    assert client.patch(f"{API}/yo", json={"username": "admin"}, headers=h).status_code == 422


def test_eliminar_cuenta(client: TestClient, registrar: Callable[..., dict]) -> None:
    sesion = registrar()
    assert client.delete(f"{API}/yo", headers=cabeceras(sesion)).status_code == 204
    assert client.get(f"{API}/yo", headers=cabeceras(sesion)).status_code == 401
    r = client.post(f"{API}/auth/login", json={"email": "ana@example.com", "contrasena": "clave-segura-1"})
    assert r.status_code == 401
