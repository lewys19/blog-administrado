"""Tareas de consola.

    python -m app.cli crear-admin --email tu@correo.com --nombre "Tu Nombre"
        Crea la cuenta (pide la contraseña sin mostrarla) o, si ya existe, la hace Administrador.
"""

import argparse
import getpass
import sys

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.fechas import ahora
from app.core.permisos import ADMINISTRADOR
from app.core.security import hash_contrasena
from app.models import Usuario
from app.services.usuarios import username_libre


def crear_admin(email: str, nombre: str) -> None:
    email = email.strip().lower()
    with SessionLocal() as db:
        usuario = db.scalar(select(Usuario).where(Usuario.email == email))
        if usuario is None:
            contrasena = getpass.getpass("Contraseña (mínimo 12 caracteres): ")
            if len(contrasena) < 12:
                sys.exit("La contraseña es demasiado corta: el panel controla todo el sitio.")
            if getpass.getpass("Repítela: ") != contrasena:
                sys.exit("Las contraseñas no coinciden.")
            usuario = Usuario(
                email=email,
                username=username_libre(db, nombre),
                nombre=nombre,
                hash_contrasena=hash_contrasena(contrasena),
                acepto_terminos_en=ahora(),
            )
            db.add(usuario)
        usuario.rol_id = ADMINISTRADOR
        usuario.bloqueado = False
        db.commit()
        print(f"Listo: {email} es Administrador.")


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="tarea", required=True)
    p = sub.add_parser("crear-admin", help="Crea o promueve una cuenta a Administrador")
    p.add_argument("--email", required=True)
    p.add_argument("--nombre", default="Administrador")
    args = parser.parse_args()
    if args.tarea == "crear-admin":
        crear_admin(args.email, args.nombre)


if __name__ == "__main__":
    main()
