# 🚀 Hackathon: Real-Time gRPC Channel Video Translation

Bem-vindo ao desafio de backend! Sua missão é construir uma **API Gateway de alta performance** que gerencie canais bidirecionais de vídeo e texto em tempo real, garantindo latência mínima, isolamento entre canais e gerenciamento eficiente de recursos.

## 🏗️ A Arquitetura

O sistema é composto por três partes, mas você é responsável pelo coração da operação:

- **Client (Mock):** entra em canais, envia chunks de vídeo e/ou escuta legendas em tempo real.
- **API Gateway (Seu Desafio):** atua como um proxy inteligente que cria, compartilha e destrói "canais" efêmeros via gRPC.
- **Translation Service (Provedor):** serviço robusto em Swift (Vapor) que processa o vídeo e devolve a tradução.

## 🎯 A Missão

Você deve implementar a lógica no `api-gateway` para:

- **Entrada em Canal:** permitir que múltiplas conexões gRPC entrem no mesmo `channel_id`.
- **Pipe de Dados:** receber chunks de vídeo de um cliente do canal e repassar imediatamente para o serviço Swift, sem bufferizar o vídeo completo.
- **Broadcast:** toda legenda gerada para um `channel_id` deve ser enviada para todas as conexões ativas daquele mesmo canal.
- **Isolamento:** legendas de um canal nunca podem ser entregues para clientes de outro canal.
- **Efemeridade:** o canal é um recurso em memória mantido pelo Gateway enquanto houver clientes conectados. Quando o último cliente sair, o recurso deve ser liberado no Gateway e no Provedor.
- **Resiliência:** lidar com desconexões abruptas sem deixar "zumbis" ou vazamentos de memória no Gateway ou no serviço de tradução.

## 📡 Semântica do Canal

O contrato continua sendo `protos/translation.proto`. A nomenclatura oficial do desafio permanece `channel_id`.

Cada conexão gRPC pode atuar como:

- **Sender:** cliente que entra no canal e envia chunks reais de vídeo.
- **Listener:** cliente que entra no canal apenas para receber legendas.

Como o contrato atual possui apenas `VideoFrame`, a entrada no canal é feita pelo primeiro frame enviado pelo cliente:

```js
{
  data: Buffer.alloc(0),
  channel_id: "canal-compartilhado-123"
}
```

Regras:

- Todo cliente deve enviar um primeiro frame com `channel_id` não vazio para entrar no canal.
- `data` vazio significa apenas "entrar/registrar no canal".
- `data` com bytes representa chunk real de vídeo.
- Depois que uma conexão entrou em um `channel_id`, ela não pode trocar para outro `channel_id`.
- Vários clientes podem usar o mesmo `channel_id` simultaneamente.
- Se um cliente envia vídeo em um canal, todos os clientes conectados naquele mesmo canal recebem as legendas geradas.
- Clientes conectados em outros canais não podem receber essas legendas.
- O Gateway deve validar o `channel_id` também nas respostas vindas do Provedor antes de repassar para os clientes.

## 🛠️ Requisitos Técnicos & Restrições

- **Comunicação:** 100% gRPC (HTTP/2). Proibido o uso de REST ou bibliotecas HTTP 1.1.
- **Contrato:** o arquivo `protos/translation.proto` é a única fonte da verdade.
- **Recursos:** o serviço Swift está limitado a **256 MB de RAM**. Gerenciamento de buffer ineficiente causará Out of Memory (OOM).
- **Linguagem:** o Gateway deve ser escrito em **Node.js (TypeScript)** ou **Go**.
- **Estado:** o estado dos canais deve ser efêmero e em memória. Não crie banco de dados, fila externa ou endpoint REST para representar canais.

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

No estado inicial do repositório, o `api-gateway` expõe o contrato gRPC, mas o método `StreamTranslation` ainda retorna `UNIMPLEMENTED`. Isso é intencional: o desafio dos participantes é implementar os canais compartilhados e efêmeros dentro do gateway.

## 🏆 Critérios de Aceite

- **Ciclo de Vida:** o log do Swift deve mostrar `Encerrando/Destruindo canal X` quando o canal for encerrado.
- **Ciclo de Vida Compartilhado:** o canal deve continuar ativo enquanto houver pelo menos uma conexão naquele `channel_id`. O canal só deve ser encerrado quando o último cliente sair.
- **Imutabilidade:** o `channel_id` enviado pelo cliente deve ser preservado e validado em todos os frames da mesma conexão.
- **Broadcast:** todos os clientes conectados ao mesmo `channel_id` devem receber as legendas geradas para aquele canal.
- **Isolamento:** nenhum cliente pode receber legenda de outro `channel_id`.
- **Concorrência:** o gateway deve suportar múltiplos canais simultâneos, cada um com múltiplos clientes conectados.

## 💡 Dicas de Ouro

- O gRPC-Swift é muito sensível ao fechamento de streams. Certifique-se de que o seu Gateway está enviando o sinal de `end` corretamente.
- Cuidado com o acúmulo de dados em memória. Faça o **pipe** dos dados, não o **buffer**.
- O "canal" do desafio é um agrupamento efêmero de streams bidirecionais gRPC com o mesmo `channel_id`.
- Não crie um banco, fila ou endpoint REST para representar esse recurso.
- O `channel_id` vem do cliente e deve atravessar o gateway sem ser recriado.
- Um listener deve conseguir entrar no canal enviando um frame inicial com `data` vazio.
- Um cliente lento não deve causar acúmulo ilimitado de mensagens em memória.

## 🧪 Teste de Aceite

Fornecemos o script `client-tester.js` para validar a implementação do gateway. Antes da solução dos participantes, esse script deve falhar com `UNIMPLEMENTED`, terminar sem legendas ou detectar problemas de isolamento/broadcast. Depois da implementação correta, ele deve receber legendas em todos os clientes conectados aos canais e o serviço Swift deve encerrar cada canal ao fim do uso.

Instalar dependências:

```Bash
npm install @grpc/grpc-js @grpc/proto-loader
```

Subir o Ambiente:

```Bash
docker compose up --build
```

Executar o Script:

```Bash
node client-tester.js
```

O teste atual cria:

- 3 canais simultâneos.
- 5 conexões por canal.
- 1 sender por canal enviando vídeo real.
- 4 listeners por canal apenas recebendo legendas.

O teste espera que:

- Todos os 5 clientes de cada canal recebam as legendas daquele canal.
- Nenhum cliente receba legenda de outro canal.
- Todos os canais sejam finalizados sem erro.

Observe os logs do `service-translation`: se o gerenciamento de canais estiver correto, você verá os chunks chegando para cada `channel_id` e cada canal sendo encerrado quando não houver mais clientes ativos.
