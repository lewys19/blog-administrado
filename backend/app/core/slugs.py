"""URLs amigables: «Cómo usar FastAPI con PostgreSQL» → como-usar-fastapi-con-postgresql."""

import re
import unicodedata


def slugificar(texto: str, maximo: int = 80) -> str:
    plano = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", plano).strip("-")[:maximo].strip("-")
    return slug or "sin-titulo"
