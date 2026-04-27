const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const fs = require('fs');
const path = require('path');

const PROTO_PATH = path.join(__dirname, './protos/translation.proto');
const VIDEO_PATH = path.join(__dirname, './test-video.mp4'); // Certifique-se de que o vídeo existe aqui

const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, defaults: true });
const translationProto = grpc.loadPackageDefinition(packageDefinition).translation.v1;

const client = new translationProto.TranslationProvider(
  'localhost:50052',
  grpc.credentials.createInsecure()
);

const CONCURRENT_STREAMS = 200;

function runStream(streamNumber) {
  return new Promise((resolve) => {
    const channelId = `video-stream-${streamNumber}-${Math.random().toString(36).substring(7)}`;
    const call = client.StreamTranslation();
    let receivedResults = 0;
    let mismatchedResults = 0;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;

      if (receivedResults === 0) {
        console.warn(`[${channelId}] ⚠️ Stream finalizada sem nenhuma legenda retornada pelo servidor.`);
      }

      if (mismatchedResults > 0) {
        console.error(`[${channelId}] ❌ Stream recebeu ${mismatchedResults} legenda(s) de outro canal.`);
      }

      console.log(`[${channelId}] 🏁 Stream finalizada com ${receivedResults} legenda(s).`);
      resolve({ channelId, receivedResults, mismatchedResults });
    };

    console.log(`[${channelId}] 🎬 Iniciando stream de vídeo real`);

    call.on('data', (response) => {
      const responseChannelId = response.channel_id || response.channelId || '';

      if (responseChannelId !== channelId) {
        mismatchedResults += 1;
        console.error(`[${channelId}] ❌ Legenda recebida no canal errado: ${responseChannelId || '<vazio>'}`);
        call.cancel();
        return;
      }

      receivedResults += 1;
      console.log(`[${channelId}] [LEGENDA] ${response.text}`);
    });

    call.on('error', (err) => {
      console.error(`[${channelId}] ❌ Erro:`, err.message);
      finish();
    });

    call.on('end', finish);

    call.on('status', (status) => {
      console.log(`[${channelId}] ℹ️ Status gRPC: ${grpc.status[status.code] || status.code} - ${status.details}`);
    });

    // Lendo o vídeo em chunks de 64KB (tamanho comum para buffers de rede)
    const readStream = fs.createReadStream(VIDEO_PATH, { highWaterMark: 64 * 1024 });

    readStream.on('data', (chunk) => {
      const canContinue = call.write({
        data: chunk,
        channel_id: channelId
      });

      console.log(`[${channelId}] 📤 Enviado chunk de ${chunk.length} bytes...`);

      if (!canContinue) {
        readStream.pause();
        call.once('drain', () => readStream.resume());
      }
    });

    readStream.on('end', () => {
      console.log(`[${channelId}] 📦 Fim do arquivo de vídeo. Fechando stream gRPC...`);
      call.end();
    });

    readStream.on('error', (err) => {
      console.error(`[${channelId}] ❌ Erro ao ler o arquivo de vídeo:`, err);
      call.cancel();
      finish();
    });
  });
}

Promise.all(Array.from({ length: CONCURRENT_STREAMS }, (_, index) => runStream(index + 1)))
  .then((results) => {
    const totalLegends = results.reduce((sum, result) => sum + result.receivedResults, 0);
    const totalMismatches = results.reduce((sum, result) => sum + result.mismatchedResults, 0);

    if (totalMismatches > 0) {
      console.error(`❌ ${totalMismatches} legenda(s) recebida(s) em canal incorreto.`);
      process.exitCode = 1;
    }

    console.log(`✅ ${results.length} streams finalizadas. Total de legendas recebidas: ${totalLegends}`);
    client.close();
  })
  .catch((err) => {
    console.error('❌ Erro inesperado:', err);
    client.close();
    process.exitCode = 1;
  });
