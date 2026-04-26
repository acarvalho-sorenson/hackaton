const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const fs = require('fs');
const path = require('path');

const PROTO_PATH = path.join(__dirname, './protos/translation.proto');
const VIDEO_PATH = path.join(__dirname, './test-video.mp4'); // Certifique-se de que o vídeo existe aqui

const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, defaults: true });
const translationProto = grpc.loadPackageDefinition(packageDefinition).translation;

const client = new translationProto.TranslationProvider(
  'localhost:50052',
  grpc.credentials.createInsecure()
);

const channelId = `video-stream-${Math.random().toString(36).substring(7)}`;
const call = client.StreamTranslation();

console.log(`🎬 Iniciando stream de vídeo real no canal: ${channelId}`);

// Ouvindo as legendas que voltam do serviço Swift
call.on('data', (response) => {
  console.log(`[LEGENDA] ${response.text}`);
});

call.on('error', (err) => console.error('❌ Erro:', err.message));
call.on('end', () => console.log('🏁 Stream finalizada.'));

// Lendo o vídeo em Chunks de 64KB (tamanho comum para buffers de rede)
const readStream = fs.createReadStream(VIDEO_PATH, { highWaterMark: 64 * 1024 });

readStream.on('data', (chunk) => {
  // Enviando o chunk binário real para o gRPC
  call.write({
    data: chunk,
    channel_id: channelId
  });
  console.log(`📤 Enviado chunk de ${chunk.length} bytes...`);
});

readStream.on('end', () => {
  console.log('📦 Fim do arquivo de vídeo. Fechando stream gRPC...');
  call.end();
});

readStream.on('error', (err) => {
  console.error('❌ Erro ao ler o arquivo de vídeo:', err);
  call.cancel();
});