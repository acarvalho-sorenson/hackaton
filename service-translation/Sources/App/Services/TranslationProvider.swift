import Foundation
import GRPC
import NIOCore

func logChannelEvent(_ message: String) {
    FileHandle.standardOutput.write(Data("\(message)\n".utf8))
}

final class TranslationProvider: Translation_V1_TranslationProviderProvider {
    var interceptors: Translation_V1_TranslationProviderServerInterceptorFactoryProtocol?

    func streamTranslation(
        context: StreamingResponseCallContext<Translation_V1_TranslationResult>
    ) -> EventLoopFuture<(StreamEvent<Translation_V1_VideoFrame>) -> Void> {
        var channelID: String?
        var isClosed = false
        var inputEnded = false
        var pendingResponses = 0

        func closeChannel(status: GRPCStatus) {
            guard !isClosed else { return }
            isClosed = true

            if let channelID {
                logChannelEvent("Encerrando/Destruindo canal \(channelID)")
            } else {
                logChannelEvent("Encerrando/Destruindo canal desconhecido")
            }

            context.statusPromise.succeed(status)
        }

        func finishIfDrained() {
            guard inputEnded && pendingResponses == 0 else { return }
            closeChannel(status: .ok)
        }

        let handler: (StreamEvent<Translation_V1_VideoFrame>) -> Void = { event in
            switch event {
            case .message(let frame):
                let frameChannelID = frame.channelID.trimmingCharacters(in: .whitespacesAndNewlines)

                guard !frameChannelID.isEmpty else {
                    closeChannel(status: GRPCStatus(code: .invalidArgument, message: "channel_id is required on every frame"))
                    return
                }

                if let activeChannelID = channelID, activeChannelID != frameChannelID {
                    closeChannel(status: GRPCStatus(code: .invalidArgument, message: "channel_id cannot change within a stream"))
                    return
                }

                if channelID == nil {
                    channelID = frameChannelID
                    logChannelEvent("Iniciando canal \(frameChannelID)")
                }

                logChannelEvent("Processando stream no canal \(frameChannelID)")

                let delayMilliseconds = Int64.random(in: 25...150)
                pendingResponses += 1
                context.eventLoop.scheduleTask(in: .milliseconds(delayMilliseconds)) {
                    defer {
                        pendingResponses -= 1
                        finishIfDrained()
                    }

                    guard !isClosed else { return }

                    var result = Translation_V1_TranslationResult()
                    result.text = "Legenda mockada"
                    result.channelID = frameChannelID
                    context.sendResponse(result, promise: nil)
                }

            case .end:
                inputEnded = true
                finishIfDrained()
            }
        }

        return context.eventLoop.makeSucceededFuture(handler)
    }
}
