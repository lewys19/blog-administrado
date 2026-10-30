"""Markdown → HTML listo para mostrar.

Se hace al guardar (no en cada visita): el lector recibe la página armada y Google la lee completa.
- Código con ```python … ``` sale resaltado (Pygments, clases CSS; los colores los pone la web).
- Títulos con id para enlazar a una sección (#instalacion).
- El HTML se limpia con nh3: nada de <script>, onclick ni enlaces javascript:, aunque el autor los escriba.
"""

import re

import markdown
import nh3

from app.core.config import settings
from app.core.slugs import slugificar

_EXTENSIONES = ["fenced_code", "codehilite", "tables", "toc", "sane_lists", "attr_list"]
_CONFIG = {
    "codehilite": {"css_class": "codigo", "guess_lang": False},
    "toc": {"permalink": False, "slugify": lambda texto, _sep: slugificar(texto)},
}

_ETIQUETAS = {
    "a", "abbr", "b", "blockquote", "br", "code", "del", "div", "em", "figcaption", "figure", "h2", "h3", "h4",
    "h5", "h6", "hr", "i", "img", "kbd", "li", "mark", "ol", "p", "pre", "s", "span", "strong", "sub", "sup",
    "table", "tbody", "td", "th", "thead", "tr", "ul",
}  # fmt: skip
_ATRIBUTOS = {
    "*": {"class", "id"},
    "a": {"href", "title"},
    "img": {"src", "alt", "title", "width", "height", "loading"},
    "td": {"align"},
    "th": {"align"},
}


def a_html(texto: str) -> str:
    # Un «# Título» dentro del artículo pasa a h2: el h1 de la página es el título del artículo.
    html = markdown.markdown(texto, extensions=_EXTENSIONES, extension_configs=_CONFIG, output_format="html")
    html = re.sub(r"<(/?)h1(\b[^>]*)>", r"<\1h2\2>", html)
    html = re.sub(r"<img\b", '<img loading="lazy"', html)
    return nh3.clean(
        html,
        tags=_ETIQUETAS,
        attributes=_ATRIBUTOS,
        url_schemes={"http", "https", "mailto"},
        link_rel="noopener noreferrer",
    )


def minutos_lectura(texto: str) -> int:
    palabras = len(re.findall(r"\w+", texto))
    return max(1, round(palabras / settings.PALABRAS_POR_MINUTO))
