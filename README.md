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
.venv/bin/python -m app.cli crear-admin --email tu@correo.com --nombre "Tu Nombre"
.venv/bin/uvicorn app.main:app --port 8300 --reload   # API y documentación: http://localhost:8300/docs
.venv/bin/python -m pytest -q

cd ../web
npm install
npm run dev -- -H 0.0.0.0                    # http://localhost:3300 · panel en /admin
```

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
