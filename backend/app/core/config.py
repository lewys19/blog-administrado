"""Configuración central de la aplicación.

Lee las variables desde un archivo .env (si existe) o desde el entorno.
Así los valores sensibles no van en el código.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "zcorp-stack API"
    DATABASE_URL: str = "postgresql+psycopg://zcorp:zcorp@localhost:5434/zcorp"
    REDIS_URL: str = "redis://localhost:6381/0"

    # Sesión. Obligatorio: una frase larga y aleatoria. Genera una con:
    #   python -c "import secrets; print(secrets.token_urlsafe(48))"
    SECRET_KEY: str = ""
    MINUTOS_TOKEN_ACCESO: int = 30
    DIAS_TOKEN_REFRESCO: int = 30

    # Ingreso: intentos fallidos permitidos por cuenta y por IP antes de esperar.
    MAX_INTENTOS_LOGIN: int = 5
    MINUTOS_BLOQUEO_LOGIN: int = 15

    # Orígenes del frontend que pueden llamar a la API (separados por coma).
    # La web pasa por el mismo dominio; esto es para herramientas externas.
    CORS_ORIGINS: str = "http://localhost:3300"

    # Imágenes: "local" (disco del servidor, servidas en /media) o, más adelante, "r2" (Cloudflare R2).
    ALMACEN_FOTOS: str = "local"
    CARPETA_MEDIA: str = "./media"
    MAX_MB_FOTO: int = 8

    # Lectura: palabras por minuto para estimar el tiempo de lectura de un artículo técnico.
    PALABRAS_POR_MINUTO: int = 200

    # Analítica: país de cada visita. Primero la cabecera del proxy (Cloudflare manda CF-IPCountry);
    # si no viene, la base gratuita de DB-IP (geo/pais.mmdb, se descarga al construir la imagen).
    CABECERA_PAIS: str = "CF-IPCountry"
    BASE_PAISES: str = "./geo/pais.mmdb"
    MAX_VISITAS_POR_MINUTO: int = 60  # por IP; más que eso es un robot
    MAX_COMENTARIOS_POR_HORA: int = 5  # por IP
    # Zona con la que se cortan los días y meses de las estadísticas ("hoy" empieza a medianoche de Lima).
    ZONA_HORARIA: str = "America/Lima"


# Instancia única que importaremos en el resto del proyecto.
settings = Settings()
