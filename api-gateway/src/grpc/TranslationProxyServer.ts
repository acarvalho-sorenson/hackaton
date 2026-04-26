import * as grpc from "@grpc/grpc-js";
import { TranslationPackage } from "./proto";

type Dependencies = {
  translationPackage: TranslationPackage;
  translationTarget: string;
};

export function createTranslationProxyHandlers(deps: Dependencies): grpc.UntypedServiceImplementation {
  void deps;

  return {
    streamTranslation: (clientCall: grpc.ServerDuplexStream<unknown, unknown>) => {
      // TODO: implementar o canal efemero entre cliente e service-translation.
      // O canal deve ser o proprio stream bidirecional gRPC, sem persistencia externa.
      // Requisitos principais:
      // - abrir um stream upstream para deps.translationTarget;
      // - encaminhar frames sem acumular o video em memoria;
      // - validar e preservar channel_id em todos os frames;
      // - encerrar/cancelar o upstream quando o cliente finalizar, errar ou cancelar.
      clientCall.destroy(
        Object.assign(new Error("StreamTranslation must be implemented by participants"), {
          code: grpc.status.UNIMPLEMENTED
        })
      );
    }
  };
}
