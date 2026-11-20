# syntax=docker/dockerfile:1
#
# Three stages (SPEC §10.3, ADR 0002):
#   toolchain  Node for install, dev, lint, test and build; the repo is mounted
#              at /app and everything runs with the host user's uid:gid.
#   build      `npm ci && npm run build` with the code copied, not mounted.
#   web        nginx serving dist/.
#
# NODE_VERSION is pinned here and nowhere else; `engines` in package.json
# mirrors it. glibc (bookworm), not alpine, so node_modules works in the
# Playwright image too.
ARG NODE_VERSION=26.13.1

FROM node:${NODE_VERSION}-bookworm-slim AS toolchain
ENV HOME=/app/.cache/home \
    npm_config_cache=/app/.cache/npm \
    npm_config_update_notifier=false \
    npm_config_fund=false \
    npm_config_audit=false
WORKDIR /app

FROM toolchain AS build
ARG BASE_PATH=/
ENV BASE_PATH=${BASE_PATH}
COPY package.json package-lock.json ./
RUN npm ci
# The version, from `git describe` in the Makefile: .git does not reach here.
ARG VERSION=dev
ENV VERSION=${VERSION}
COPY . .
RUN npm run build

FROM nginx:1.30-alpine AS web
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
