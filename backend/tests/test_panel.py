from collections.abc import Callable

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import ADMINISTRADOR, EDITOR, INVITADO, REDACTOR, cabeceras, dar_rol

API = "/api/v1/panel"


def test_lector_no_entra_al_panel(client: TestClient, registrar: Callable[..., dict]) -> None:
    assert client.get(f"{API}/resumen", headers=cabeceras(registrar())).status_code == 403


def test_los_cuatro_roles_y_sus_permisos(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar(), ADMINISTRADOR)
    roles = {r["nombre"]: r for r in client.get(f"{API}/roles", headers=h).json()}
    assert list(roles) == ["Administrador", "Editor", "Redactor", "Invitado"]
    assert roles["Administrador"]["fijo"] and "configuracion.gestionar" in roles["Administrador"]["permisos"]
    assert "articulos.publicar" in roles["Editor"]["permisos"]
    assert "articulos.publicar" not in roles["Redactor"]["permisos"]
    assert roles["Invitado"]["permisos"] == ["articulos.escribir"]
    # El Administrador no se toca.
    r = client.put(f"{API}/roles/{ADMINISTRADOR}", json={"nombre": "Jefe", "permisos": []}, headers=h)
    assert r.status_code == 400


def test_dashboard(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar("jefe@example.com", "Jefe"), ADMINISTRADOR)
    registrar()
    r = client.get(f"{API}/resumen", headers=h).json()
    assert (r["usuarios"], r["usuarios_nuevos_7d"], r["usuarios_activos_hoy"], r["equipo"]) == (2, 2, 2, 1)


def test_tabla_de_usuarios_busca_y_pagina(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar("jefe@example.com", "Jefe"), ADMINISTRADOR)
    for i in range(12):
        registrar(f"persona{i}@example.com", f"Persona {i}")
    r = client.get(f"{API}/usuarios", params={"pagina": 2, "por_pagina": 5}, headers=h).json()
    assert (r["total"], len(r["usuarios"])) == (13, 5)
    r = client.get(f"{API}/usuarios", params={"q": "@persona-1"}, headers=h).json()
    assert {u["username"] for u in r["usuarios"]} == {"persona-1", "persona-10", "persona-11"}


def test_bloquear_cierra_sesiones_y_asignar_rol(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar("jefe@example.com", "Jefe"), ADMINISTRADOR)
    ana = registrar()
    ruta = f"{API}/usuarios/{ana['usuario']['id']}"
    assert client.patch(ruta, json={"bloqueado": True}, headers=h).json()["bloqueado"] is True
    assert client.get("/api/v1/yo", headers=cabeceras(ana)).status_code == 401
    r = client.post("/api/v1/auth/login", json={"email": "ana@example.com", "contrasena": "clave-segura-1"})
    assert r.status_code == 403
    client.patch(ruta, json={"bloqueado": False}, headers=h)
    r = client.put(f"{ruta}/rol", json={"rol_id": REDACTOR}, headers=h)
    assert r.json()["rol"] == {"id": REDACTOR, "nombre": "Redactor"}
    nueva = client.post("/api/v1/auth/login", json={"email": "ana@example.com", "contrasena": "clave-segura-1"}).json()
    assert nueva["usuario"]["en_panel"] is True
    assert client.get(f"{API}/resumen", headers=cabeceras(nueva)).status_code == 200
    assert client.get(f"{API}/usuarios", headers=cabeceras(nueva)).status_code == 403  # Redactor no ve usuarios


def test_protecciones_del_administrador(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    jefe = registrar("jefe@example.com", "Jefe")
    h_jefe = dar_rol(db, jefe, ADMINISTRADOR)
    editor = registrar("ed@example.com", "Ed")
    h_ed = dar_rol(db, editor, EDITOR)
    # Nadie se cambia el rol ni se bloquea a sí mismo desde el panel.
    assert client.put(f"{API}/usuarios/{jefe['usuario']['id']}/rol", json={"rol_id": None}, headers=h_jefe).status_code == 400
    # Un rol creable con roles.gestionar no puede nombrar Administradores ni tocar a uno.
    r = client.post(f"{API}/roles", json={"nombre": "Jefe de equipo", "permisos": ["roles.gestionar", "usuarios.editar"]}, headers=h_jefe)
    dar_rol(db, editor, r.json()["id"])
    otro = registrar("otro@example.com", "Otro")
    assert client.put(f"{API}/usuarios/{otro['usuario']['id']}/rol", json={"rol_id": ADMINISTRADOR}, headers=h_ed).status_code == 403
    assert client.patch(f"{API}/usuarios/{jefe['usuario']['id']}", json={"bloqueado": True}, headers=h_ed).status_code == 403


def test_roles_se_crean_y_no_se_borran_con_usuarios(client: TestClient, registrar: Callable[..., dict], db: Session) -> None:
    h = dar_rol(db, registrar("jefe@example.com", "Jefe"), ADMINISTRADOR)
    r = client.post(f"{API}/roles", json={"nombre": "SEO", "permisos": ["seo.gestionar", "seo.gestionar", "estadisticas.ver"]}, headers=h)
    assert r.status_code == 201 and r.json()["permisos"] == ["seo.gestionar", "estadisticas.ver"]
    assert client.post(f"{API}/roles", json={"nombre": "Raro", "permisos": ["todo"]}, headers=h).status_code == 422
    ana = registrar()
    dar_rol(db, ana, r.json()["id"])
    assert client.delete(f"{API}/roles/{r.json()['id']}", headers=h).status_code == 409
    dar_rol(db, ana, INVITADO)
    assert client.delete(f"{API}/roles/{r.json()['id']}", headers=h).status_code == 204
