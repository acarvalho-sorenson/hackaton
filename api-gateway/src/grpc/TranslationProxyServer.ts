import * as grpc from "@grpc/grpc-js";
import { TranslationPackage } from "./proto";

type VideoFrame = {
  data?: Buffer;
  channelId?: string;
};

type TranslationResult = {
  text?: string;
  channelId?: string;
};

type Dependencies = {
  translationPackage: TranslationPackage;
  translationTarget: string;
};

export function createTranslationProxyHandlers(deps: Dependencies): grpc.UntypedServiceImplementation {
  return {
    streamTranslation: (clientCall: grpc.ServerDuplexStream<VideoFrame, TranslationResult>) => {
      const translationClient = new deps.translationPackage.TranslationProvider(
        deps.translationTarget,
        grpc.credentials.createInsecure()
      ) as unknown as grpc.Client & {
        streamTranslation: () => grpc.ClientDuplexStream<VideoFrame, TranslationResult>;
      };

      const upstreamCall = translationClient.streamTranslation();
      let closed = false;

      const closePipe = () => {
        if (closed) {
          return;
        }

        closed = true;
        translationClient.close();
      };

      upstreamCall.on("data", (result: TranslationResult) => {
        clientCall.write(result);
      });

      upstreamCall.on("end", () => {
        // Participante: este é um ponto natural para destruir o canal efêmero
        // depois que o service-translation encerrar a stream upstream.
        clientCall.end();
        closePipe();
      });

      upstreamCall.on("error", (error: grpc.ServiceError) => {
        clientCall.destroy(error);
        closePipe();
      });

      clientCall.on("data", (frame: VideoFrame) => {
        const channelId = frame.channelId ?? "";

        if (!channelId.trim()) {
          const serviceError = Object.assign(new Error("channel_id is required on every frame"), {
            code: grpc.status.INVALID_ARGUMENT
          });

          // Participante: ao rejeitar um frame inválido, cancele o upstream para
          // matar imediatamente o contexto efêmero aberto para este pipe.
          upstreamCall.cancel();
          clientCall.destroy(serviceError);
          closePipe();
          return;
        }

        upstreamCall.write(frame);
      });

      clientCall.on("end", () => {
        // Participante: implemente aqui a política de kill do canal quando o
        // downstream finalizar normalmente, por exemplo limpando métricas locais.
        upstreamCall.end();
      });

      clientCall.on("error", () => {
        // Participante: cancelamento/erro downstream deve matar o canal upstream
        // para liberar memória no service-translation imediatamente.
        upstreamCall.cancel();
        closePipe();
      });

      clientCall.on("cancelled", () => {
        // Participante: clientes podem cancelar sem emitir end; trate este caso
        // como destruição explícita do canal efêmero.
        upstreamCall.cancel();
        closePipe();
      });
    }
  };
}
