import path from "node:path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

export type TranslationPackage = grpc.GrpcObject & {
  TranslationProvider: grpc.ServiceClientConstructor;
  ChannelManager: grpc.ServiceClientConstructor;
};

export function loadTranslationPackage(): TranslationPackage {
  const protoPath = process.env.PROTO_PATH ?? path.resolve(__dirname, "../../../protos/translation.proto");
  const definition = protoLoader.loadSync(protoPath, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

  const loaded = grpc.loadPackageDefinition(definition) as grpc.GrpcObject;
  const translation = loaded.translation as grpc.GrpcObject;
  return translation.v1 as TranslationPackage;
}
