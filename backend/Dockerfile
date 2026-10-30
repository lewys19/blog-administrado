FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Primero las dependencias, para aprovechar la caché de Docker.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# País de las visitas: base gratuita de DB-IP (CC BY 4.0), la del mes o la del anterior.
# Si no se puede bajar, la imagen se construye igual y el país sale del idioma del navegador.
RUN python - <<'PY' || true
import datetime, gzip, pathlib, urllib.request
hoy = datetime.date.today()
anterior = (hoy.replace(day=1) - datetime.timedelta(days=1))
for d in (hoy, anterior):
    try:
        url = f"https://download.db-ip.com/free/dbip-country-lite-{d:%Y-%m}.mmdb.gz"
        datos = urllib.request.urlopen(url, timeout=60).read()
        pathlib.Path("geo").mkdir(exist_ok=True)
        pathlib.Path("geo/pais.mmdb").write_bytes(gzip.decompress(datos))
        print("Base de países:", url)
        break
    except Exception as error:
        print("No se pudo bajar", d, error)
PY

RUN useradd --system --create-home zcorp
USER zcorp

EXPOSE 8000

# Aplica las migraciones pendientes y arranca la API.
# --timeout-keep-alive 65: la web (Node) reutiliza conexiones; si la API las cerrara antes,
# a veces usaría una ya cerrada ("socket hang up"). --proxy-headers: IP real detrás de Caddy.
ENV UVICORN_WORKERS=1
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers $UVICORN_WORKERS --timeout-keep-alive 65 --proxy-headers --forwarded-allow-ips='*'"]
