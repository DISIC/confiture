FROM node:18 AS builder
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_AUTH_TOKEN
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENVIRONMENT
ARG VITE_SENTRY_RELEASE
WORKDIR /app
RUN mkdir -p confiture-web-app/src/assets
RUN mkdir -p confiture-web-app/src/types
COPY package.json yarn.lock CHANGELOG.md ROADMAP.md .
COPY confiture-web-app/package.json confiture-web-app/
COPY confiture-rest-api/ confiture-rest-api/
RUN pwd
RUN ls
RUN yarn install --frozen-lockfile --non-interactive --production=false
RUN ls confiture-web-app/src/types


WORKDIR /app/confiture-web-app
COPY confiture-web-app/ .
RUN VITE_MATOMO_ENABLE=1 SENTRY_ORG=${SENTRY_ORG} SENTRY_PROJECT=${SENTRY_PROJECT} SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN} VITE_SENTRY_DSN=${VITE_SENTRY_DSN} VITE_SENTRY_ENVIRONMENT=${VITE_SENTRY_ENVIRONMENT} VITE_SENTRY_RELEASE=${VITE_SENTRY_RELEASE} yarn build

FROM ghcr.io/disic/designgouv-confiture/nginx:1.22.1-r0 AS production
ARG VERSION=1.0
# nginx config
COPY confiture-web-app/config /tmp/config
# Web app files
COPY --from=builder /app/confiture-web-app/dist /data/confiture
RUN \
  \
  # version to avoid cache \
  echo "version $VERSION" && \
  \
  # nginx config \
  rm -rf /etc/nginx && \
  mkdir /etc/nginx /etc/nginx_user && \
  tar -C /tmp/config/config_nginx -cf - . | tar -C /etc/nginx -xf - && \
  tar -C /tmp/config/config_nginx_user -cf - . | tar -C /etc/nginx_user -xf - && \
  rm -rf tmp/config && \
  \
  # set correct permissions \
  chown -R root:root /etc/nginx && \
  chown -R root:dinum_nginx /etc/nginx_user /data && \
  chmod -R go= /etc/nginx && \
  chmod -R g=rX,o= /etc/nginx_user /data && \
  \
  # cleanup \
  find /var/cache/apk /tmp /var/tmp /run -mindepth 1 -delete -print