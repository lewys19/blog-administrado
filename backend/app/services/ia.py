"""IA: genera el borrador de un artículo con Claude a partir de un tema.

Devuelve título, resumen, contenido en Markdown y etiquetas; el editor los
pone en el formulario y la persona revisa antes de guardar (nada se publica solo).
La clave va en ANTHROPIC_API_KEY (variable de entorno o .env).
"""

import json
from typing import Any

import anthropic

from app.core.config import settings
from app.core.errores import ErrorNegocio

SISTEMA = """Eres redactor de un blog en español sobre tecnología, inteligencia artificial y programación.
Escribe para lectores de Latinoamérica: claro, práctico y con ejemplos reales.
Formato del contenido: Markdown, con subtítulos ## y ###, listas cuando ayuden y bloques de código
con el lenguaje indicado (```python, ```bash...). No pongas el título como # dentro del contenido.
Si no estás seguro de un dato (versiones, precios, fechas), dilo en el texto en vez de inventarlo."""

ESQUEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "titulo": {"type": "string", "description": "Título atractivo, máximo 90 caracteres"},
        "resumen": {"type": "string", "description": "Resumen de 1 o 2 frases, máximo 300 caracteres"},
        "contenido": {"type": "string", "description": "Cuerpo del artículo en Markdown"},
        "etiquetas": {
            "type": "array",
            "items": {"type": "string"},
            "description": "De 3 a 6 etiquetas cortas en minúsculas",
        },
    },
    "required": ["titulo", "resumen", "contenido", "etiquetas"],
    "additionalProperties": False,
}


def _cliente() -> anthropic.Anthropic:
    # La clave viene de settings (entorno o .env); el SDK solo leería el entorno.
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def _pedido(tema: str, indicaciones: str | None, palabras: int) -> str:
    texto = f"Escribe un artículo de unas {palabras} palabras sobre: {tema}"
    if indicaciones:
        texto += f"\n\nIndicaciones del autor:\n{indicaciones}"
    return texto


def generar_borrador(tema: str, indicaciones: str | None = None, palabras: int = 1000) -> dict[str, Any]:
    if not settings.ANTHROPIC_API_KEY:
        raise ErrorNegocio(503, "La IA no está configurada: falta ANTHROPIC_API_KEY en el servidor.")

    try:
        # Streaming: un artículo largo puede tardar más que el tiempo de espera de una petición normal.
        with _cliente().beta.messages.stream(
            model=settings.IA_MODELO,
            max_tokens=32000,
            system=SISTEMA,
            messages=[{"role": "user", "content": _pedido(tema, indicaciones, palabras)}],
            thinking={"type": "adaptive"},
            output_config={
                "effort": settings.IA_ESFUERZO,
                "format": {"type": "json_schema", "schema": ESQUEMA},
            },
            # Si el filtro de seguridad rechaza el pedido, la API lo reintenta en otro modelo.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        ) as stream:
            respuesta = stream.get_final_message()
    except anthropic.AuthenticationError as e:
        raise ErrorNegocio(503, "La clave de la IA (ANTHROPIC_API_KEY) no es válida.") from e
    except anthropic.RateLimitError as e:
        raise ErrorNegocio(429, "La IA está ocupada o se alcanzó el límite. Prueba en un minuto.") from e
    except anthropic.APIStatusError as e:
        raise ErrorNegocio(502, f"La IA respondió con un error ({e.status_code}). Prueba de nuevo.") from e
    except anthropic.APIConnectionError as e:
        raise ErrorNegocio(502, "No se pudo conectar con la IA. Revisa la conexión del servidor.") from e

    if respuesta.stop_reason == "refusal":
        raise ErrorNegocio(422, "La IA no quiso escribir sobre ese tema. Prueba a reformularlo.")
    if respuesta.stop_reason == "max_tokens":
        raise ErrorNegocio(422, "El artículo salió demasiado largo. Pide menos palabras.")

    texto = next((b.text for b in respuesta.content if b.type == "text"), "")
    try:
        datos = json.loads(texto)
    except json.JSONDecodeError as e:
        raise ErrorNegocio(502, "La IA devolvió una respuesta incompleta. Prueba de nuevo.") from e

    etiquetas = [e.strip().lower()[:40] for e in datos.get("etiquetas", []) if len(e.strip()) >= 2]
    return {
        "titulo": datos["titulo"].strip()[:160],
        "resumen": datos["resumen"].strip()[:400],
        "contenido": datos["contenido"].strip(),
        "etiquetas": list(dict.fromkeys(etiquetas))[:10],
    }
