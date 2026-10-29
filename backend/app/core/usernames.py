"""Nombre de usuario: identifica a cada persona en la web (perfil de autor en /autores/<username>).

La URL es solo visual: las relaciones siempre van por usuarios.id, nunca por el username.
"""

import re
import unicodedata

MINIMO, MAXIMO = 3, 30
# Minúsculas, números y guiones; sin guion al inicio, al final ni dos seguidos.
FORMATO = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

# Nombres que se prestan a engaño (hacerse pasar por el equipo) o que chocan con rutas.
RESERVADOS = frozenset(
    {
        "admin", "administrador", "admins", "root", "sistema", "staff", "equipo", "oficial", "soporte", "ayuda",
        "zcorp", "zcorp-stack", "seguridad", "legal", "terminos", "privacidad", "contacto", "api", "login",
        "registro", "perfil", "autores", "blog", "articulos", "categorias", "etiquetas", "buscar", "newsletter",
        "tienda", "cursos", "verificar", "configuracion", "www", "mail", "app", "user", "users", "usuario",
    }
)  # fmt: skip


def problema(username: str) -> str | None:
    """Por qué no sirve (texto para el usuario) o None si es válido. No revisa si ya está tomado."""
    if not MINIMO <= len(username) <= MAXIMO:
        return f"El nombre de usuario debe tener entre {MINIMO} y {MAXIMO} caracteres."
    if not FORMATO.match(username):
        return "Usa solo minúsculas, números y guiones (sin guion al inicio ni al final)."
    if username in RESERVADOS or username.startswith("eliminado-"):
        return "Nombre de usuario no disponible."
    return None


def de_cuenta_eliminada(usuario_id: int) -> str:
    """Al borrar una cuenta su username queda libre; este lo reemplaza y nadie más puede pedirlo."""
    return f"eliminado-{usuario_id}"


def base_desde(texto: str) -> str:
    """«Lewys Ramos» → «lewys-ramos»; «José Ñique» → «jose-nique». Siempre devuelve algo válido de formato."""
    plano = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()
    base = re.sub(r"[^a-z0-9]+", "-", plano).strip("-")[: MAXIMO - 4].strip("-")
    return base if len(base) >= MINIMO else f"usuario-{base}".strip("-")
