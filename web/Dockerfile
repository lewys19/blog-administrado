# ---------- 1. Dependencias ----------
FROM node:24-alpine AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- 2. Compilación ----------
FROM node:24-alpine AS compilacion
WORKDIR /app
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .
# Adónde reenvía Next.js las llamadas /api/v1 (queda fijo al compilar).
ARG API_INTERNA=http://api:8000
# Dirección pública, redes y correo de contacto: van dentro de las páginas que se arman al compilar
# (encabezado, pie, robots.txt), así que se fijan aquí. Cambiarlos = volver a compilar la imagen.
ARG SITIO_URL=http://localhost:3300
ARG CORREO_CONTACTO=""
ARG RED_FACEBOOK=""
ARG RED_X=""
ARG RED_LINKEDIN=""
ARG RED_YOUTUBE=""
ARG RED_GITHUB=""
ENV API_INTERNA=$API_INTERNA SITIO_URL=$SITIO_URL CORREO_CONTACTO=$CORREO_CONTACTO RED_FACEBOOK=$RED_FACEBOOK \
    RED_X=$RED_X RED_LINKEDIN=$RED_LINKEDIN RED_YOUTUBE=$RED_YOUTUBE RED_GITHUB=$RED_GITHUB NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- 3. Servidor mínimo (output: standalone) ----------
FROM node:24-alpine
WORKDIR /app
# Las mismas variables también para las páginas que se arman en cada visita.
ARG SITIO_URL=http://localhost:3300
ARG CORREO_CONTACTO=""
ARG RED_FACEBOOK=""
ARG RED_X=""
ARG RED_LINKEDIN=""
ARG RED_YOUTUBE=""
ARG RED_GITHUB=""
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    SITIO_URL=$SITIO_URL CORREO_CONTACTO=$CORREO_CONTACTO RED_FACEBOOK=$RED_FACEBOOK RED_X=$RED_X \
    RED_LINKEDIN=$RED_LINKEDIN RED_YOUTUBE=$RED_YOUTUBE RED_GITHUB=$RED_GITHUB
COPY --from=compilacion --chown=node:node /app/.next/standalone ./
COPY --from=compilacion --chown=node:node /app/.next/static ./.next/static
COPY --from=compilacion --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
