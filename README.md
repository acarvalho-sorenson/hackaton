# 🚀 Hackathon: Real-Time gRPC Video Stream Translation

Bem-vindo ao desafio de backend! Sua missão é construir uma **API Gateway de alta performance** que gerencie streams bidirecionais de vídeo e texto, garantindo latência mínima e gerenciamento eficiente de recursos.

## 🏗️ A Arquitetura

O sistema é composto por três partes, mas você é responsável pelo coração da operação:

- **Client (Mock):** envia chunks de vídeo e espera legendas em tempo real.
- **API Gateway (Seu Desafio):** atua como um proxy inteligente que cria e destrói "canais" efêmeros via gRPC.
- **Translation Service (Provedor):** serviço robusto em Swift (Vapor) que processa o vídeo e devolve a tradução.

## 🎯 A Missão

Você deve implementar a lógica no `api-gateway` para:

- **Pipe de Dados:** receber o stream do cliente e repassar imediatamente para o serviço Swift.
- **Efemeridade:** o "canal" não é um banco de dados, é a própria conexão. Se a conexão cair ou terminar, o recurso deve ser liberado no Provedor.
- **Resiliência:** lidar com desconexões abruptas sem deixar "zumbis" ou vazamentos de memória no serviço de tradução.

## 🛠️ Requisitos Técnicos & Restrições

- **Comunicação:** 100% gRPC (HTTP/2). Proibido o uso de REST ou bibliotecas HTTP 1.1.
- **Contrato:** o arquivo `protos/translation.proto` é a única fonte da verdade.
- **Recursos:** o serviço Swift está limitado a **256 MB de RAM**. Gerenciamento de buffer ineficiente causará Out of Memory (OOM).
- **Linguagem:** o Gateway deve ser escrito em **Node.js (TypeScript)** ou **Go**.

## 📂 Estrutura do Projeto

```plaintext
.
├── protos/                 # Contrato gRPC (.proto)
├── service-translation/    # [ORGANIZAÇÃO] Serviço Swift/Vapor (Não mexer)
├── api-gateway/            # [VOCÊ] Esqueleto do seu desafio
└── docker-compose.yaml     # Orquestração do ambiente
```

## 🚀 Como Iniciar

Suba o ambiente:

```bash
docker compose up --build
```

O que observar:

- O `service-translation` rodará em `localhost:50051`.
- Seu `api-gateway` deve expor a porta `50052`.
- Fique de olho nos logs: o serviço Swift avisará quando um canal for **Iniciado** ou **Destruído**.

## 🏆 Critérios de Aceite

- **Ciclo de Vida:** o log do Swift deve mostrar `Encerrando canal X` assim que o cliente terminar o stream.
- **Imutabilidade:** o `channel_id` enviado pelo cliente deve ser preservado e validado em todos os frames.
- **Concorrência:** o gateway deve suportar múltiplos clientes simultâneos, cada um com seu próprio canal efêmero.

## 💡 Dicas de Ouro

- O gRPC-Swift é muito sensível ao fechamento de streams. Certifique-se de que o seu Gateway está enviando o sinal de `end` corretamente.
- Cuidado com o acúmulo de dados em memória. Faça o **pipe** dos dados, não o **buffer**.

## Fornecemos um script video-client-tester.js. Para testar:

- Coloque um arquivo chamado test-video.mp4 na raiz.
- Execute node video-client-tester.js.
- Observe os logs do service-translation: se o gerenciamento de canais estiver correto, você verá os chunks chegando e o canal sendo encerrado ao fim do vídeo.
