FROM directus/directus:11.14.0

# Puppeteer needs a browser. For Alpine-based images, chromium is available via apk.
# Directus official image is Alpine in v11.x.
USER root

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Install deps in Directus runtime.
# IMPORTANT: Directus image uses pnpm store under /home/node; install as user "node"
# to avoid store-location mismatch errors.
WORKDIR /directus
RUN mkdir -p /home/node/.local/share/pnpm/store && chown -R node:node /home/node/.local

USER node

# Keep pnpm store consistent with base image
RUN pnpm config set store-dir /home/node/.local/share/pnpm/store/v10 --global
RUN pnpm add puppeteer pdf-lib

# Tell puppeteer to use system Chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

