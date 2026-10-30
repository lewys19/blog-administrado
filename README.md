# zcorp-stack

Blog de tecnología, IA y programación con un panel de backoffice propio (nombre provisional).

Arquitectura y plan por sprints: https://claude.ai/artifact/J9TDfsvLi2oruWutksru3r

## Programar en tu equipo

```bash
cp .env.example .env                         # completa DB_PASSWORD y SECRET_KEY
docker compose up -d db redis                # base (127.0.0.1:5434) y Redis (127.0.0.1:6381)

cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
# backend/.env con DATABASE_URL, REDIS_URL y SECRET_KEY (los mismos valores del .env de arriba)
.venv/bin/alembic upgrade head
# País de las visitas (opcional): base gratuita de DB-IP en backend/geo/pais.mmdb (la imagen Docker la baja sola)
mkdir -p geo && curl -sL https://download.db-ip.com/free/dbip-country-lite-$(date +%Y-%m).mmdb.gz | gunzip > geo/pais.mmdb
.venv/bin/python -m app.cli crear-admin --email tu@correo.com --nombre "Tu Nombre"
.venv/bin/uvicorn app.main:app --port 8300 --reload   # API y documentación: http://localhost:8300/docs
.venv/bin/python -m pytest -q

cd ../web
npm install
npm run dev -- -H 0.0.0.0                    # http://localhost:3300 · panel en /admin
```

## Estadísticas

El blog cuenta sus visitas sin Google Analytics, sin cookies y sin guardar la IP
(`app/services/estadisticas.py`). No cuenta robots, prefetch ni a quien tiene sesión del panel.
El país sale de la cabecera `CF-IPCountry` (si hay Cloudflare delante) o de la base de
[DB-IP](https://db-ip.com) (licencia CC BY 4.0, pide mencionarla); sin ninguna de las dos, del idioma del navegador.

## Correo (boletín)

El boletín envía por SMTP: sirve el correo de tu hosting, Gmail (con contraseña de aplicación) o Brevo.
Sin `SMTP_HOST` no sale nada: cada correo se guarda como `.eml` en `backend/buzon/` para revisarlo.
Variables: `SITIO_URL` (dirección pública del blog, va en los enlaces), `SMTP_HOST`, `SMTP_PUERTO` (587),
`SMTP_USUARIO`, `SMTP_CLAVE`, `SMTP_SEGURIDAD` (`starttls`, `ssl` o `ninguna`) y `CORREO_REMITENTE`
(por ejemplo `zcorp-stack <boletin@tudominio.com>`; usa una dirección de tu dominio para no caer en spam).

## Despliegue (VPS con Docker)

Mismo esquema que Altoque: GitHub Actions compila y sube las imágenes al hacer push a `main`
(`ghcr.io/lewys19/blog-administrado-api` y `-web`); el VPS solo descarga y arranca.

1. DNS: registro A `blog` → IP del VPS (en el cPanel de zcorp23.com).
2. En el VPS, carpeta `~/blog` con `docker-compose.prod.yml` (renombrado a `docker-compose.yml`) y `.env`
   (ver `.env.prod.example`, `chmod 600`).
3. Bloque en el Caddyfile del proxy compartido (`~/proxy/Caddyfile`) y `docker compose restart` del proxy:

   ```
   blog.zcorp23.com {
   	import seguridad
   	encode zstd gzip
   	request_body {
   		max_size 12MB
   	}
   	reverse_proxy blog-web:3000
   }
   ```
4. `docker compose pull && docker compose up -d` (la API corre las migraciones al arrancar).
5. Administrador: `docker compose exec api python -m app.cli crear-admin --email TU_CORREO --nombre "Tu nombre"`.

Para cambiar la dirección pública: variable `SITIO_URL` del repositorio (la web la fija al compilar) y la del `.env`.

## Puertos

| Servicio | Puerto |
|---|---|
| Web (`npm run dev`) | 3300 |
| API | 8300 |
| PostgreSQL | 127.0.0.1:5434 |
| Redis | 127.0.0.1:6381 |

Elegidos para no chocar con Altoque (3100/3200, 8100, 5433, 6380) en el mismo equipo y servidor.

## Ramas

`main` es producción. Se trabaja en `sprint-N` y se une a `main` cuando el sprint funciona.
