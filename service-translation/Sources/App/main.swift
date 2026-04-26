import Vapor
import GRPC
import NIOCore
import NIOPosix

let app = Application(.production)
defer { app.shutdown() }

let group = MultiThreadedEventLoopGroup(numberOfThreads: System.coreCount)
defer { try? group.syncShutdownGracefully() }

let provider = TranslationProvider()
let server = try Server.insecure(group: group)
    .withServiceProviders([provider])
    .bind(host: "0.0.0.0", port: 50051)
    .wait()

app.logger.info("service-translation gRPC server listening on \(server.channel.localAddress?.description ?? "0.0.0.0:50051")")
try server.onClose.wait()
