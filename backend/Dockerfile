FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Primero las dependencias, para aprovechar la caché de Docker.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd --system --create-home zcorp
USER zcorp

EXPOSE 8000

# Aplica las migraciones pendientes y arranca la API.
# --timeout-keep-alive 65: la web (Node) reutiliza conexiones; si la API las cerrara antes,
# a veces usaría una ya cerrada ("socket hang up"). --proxy-headers: IP real detrás de Caddy.
ENV UVICORN_WORKERS=1
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers $UVICORN_WORKERS --timeout-keep-alive 65 --proxy-headers --forwarded-allow-ips='*'"]
