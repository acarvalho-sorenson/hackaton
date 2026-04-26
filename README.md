# Hackathon Video Translation gRPC Monorepo

Monorepo inicial para tradução de vídeo usando gRPC com HTTP/2 e bidirectional streaming.

## Arquitetura

```text
.
├── protos
│   └── translation.proto
├── service-translation
│   ├── Dockerfile
│   ├── Package.swift
│   ├── Scripts
│   │   └── generate-protos.sh
│   └── Sources
│       └── App
│           ├── Generated
│           ├── Services
│           │   └── MockTranslationProvider.swift
│           └── main.swift
├── api-gateway
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src
│       ├── channels
│       │   └── ChannelSessionManager.ts
│       ├── generated
│       │   └── README.md
│       ├── grpc
│       │   ├── ChannelManagerServer.ts
│       │   ├── TranslationProxyServer.ts
│       │   └── proto.ts
│       └── index.ts
└── docker-compose.yaml
```

## Serviços

- `service-translation`: Swift 5.9 + Vapor + grpc-swift na porta `50051`.
- `api-gateway`: Node.js + TypeScript + grpc-js na porta `50052`.
- `/protos/translation.proto`: contrato compartilhado entre os serviços.

## Execução

Na raiz do projeto, execute:

```bash
docker compose up --build
```

Esse comando constrói as imagens Docker e sobe os dois serviços gRPC:

- `service-translation` em `localhost:50051`.
- `api-gateway` em `localhost:50052`.

Para parar os containers:

```bash
docker compose down
```

## Contratos gRPC

- `TranslationProvider.StreamTranslation`: stream bidirecional de `VideoFrame` para `TranslationResult`.
- `ChannelManager.CreateChannel`: cria uma sessão lógica de canal no gateway.
- `ChannelManager.KillChannel`: marca uma sessão lógica como encerrada no gateway.

O gateway expõe `TranslationProvider` e encaminha o stream para `service-translation`. O provider Swift responde cada frame com `Legenda mockada`, preservando o `channel_id`.

## Restrições

- Não há endpoint REST/HTTP 1.1.
- Toda comunicação exposta entre cliente, gateway e provider é gRPC sobre HTTP/2.
- O build Docker copia `/protos` para ambos os serviços e gera os stubs Swift no estágio de build do provider.
