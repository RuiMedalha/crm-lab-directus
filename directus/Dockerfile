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

# Install deps in Directus runtime
WORKDIR /directus
RUN pnpm add puppeteer pdf-lib

# Tell puppeteer to use system Chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

USER node

