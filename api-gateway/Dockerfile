FROM node:24-alpine3.21 AS build

WORKDIR /workspace

COPY api-gateway/package*.json ./api-gateway/
WORKDIR /workspace/api-gateway
RUN apk upgrade --no-cache && npm ci

WORKDIR /workspace
COPY protos ./protos
COPY api-gateway ./api-gateway

WORKDIR /workspace/api-gateway
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-alpine3.21 AS runtime

WORKDIR /workspace

RUN apk upgrade --no-cache

COPY --from=build /workspace/protos ./protos
COPY --from=build /workspace/api-gateway/dist ./api-gateway/dist
COPY --from=build /workspace/api-gateway/node_modules ./api-gateway/node_modules
COPY --from=build /workspace/api-gateway/package.json ./api-gateway/package.json

WORKDIR /workspace/api-gateway
ENV PROTO_PATH=/workspace/protos/translation.proto
ENV PORT=50052

EXPOSE 50052
CMD ["npm", "start"]
