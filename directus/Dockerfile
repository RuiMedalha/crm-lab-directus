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

# IMPORTANT:
# Do NOT run `pnpm add` in /directus. It can modify Directus' own dependency tree
# and break the runtime (we hit a Zod crash on startup).
#
# If you need JS deps for extensions (e.g. puppeteer/pdf-lib), install them under
# the mounted extensions folder instead (e.g. /directus/extensions), so they are
# resolved by Node without touching Directus core.

# Tell puppeteer to use system Chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

USER node

