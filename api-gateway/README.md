TODO: implementar canais compartilhados por channel_id.
Requisitos:
- Múltiplas conexões podem entrar no mesmo channel_id;
- Primeiro frame com data vazio registra o cliente como listener;
- frames com data são enviado ao service-translation;
- Respostas do service-translation devem ser valiadadas pelo channel_id;
- legendas devem ser enviadas para todos os clientes do mesmo canal;
- Clientes de outros canais não podem receber essas legendas;
- O canal deve existir enquanto houver clientes conectados;
- Ao sair o último cliente, encerrar o upstream e liberar recursos;
- Não bufferizar o vídeo completo em memória.