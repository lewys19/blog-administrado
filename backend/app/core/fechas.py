"""Fechas: todo se guarda en UTC; la web lo muestra en la hora de quien mira."""

from datetime import UTC, datetime


def ahora() -> datetime:
    return datetime.now(UTC)
