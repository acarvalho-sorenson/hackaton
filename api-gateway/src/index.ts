import * as grpc from "@grpc/grpc-js";
import { createTranslationProxyHandlers } from "./grpc/TranslationProxyServer";
import { loadTranslationPackage } from "./grpc/proto";

const port = process.env.PORT ?? "50052";
const bindAddress = `0.0.0.0:${port}`;
const translationTarget = process.env.TRANSLATION_SERVICE_ADDR ?? "service-translation:50051";

const translationPackage = loadTranslationPackage();
const server = new grpc.Server();

server.addService(
  translationPackage.TranslationProvider.service,
  createTranslationProxyHandlers({ translationPackage, translationTarget })
);

server.bindAsync(bindAddress, grpc.ServerCredentials.createInsecure(), (error, actualPort) => {
  if (error) {
    throw error;
  }

  server.start();
  console.log(`api-gateway gRPC server listening on 0.0.0.0:${actualPort}`);
  console.log(`proxying TranslationProvider streams to ${translationTarget}`);
});
