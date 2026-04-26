FROM swift:5.9-jammy AS build

RUN apt-get update && apt-get install -y --no-install-recommends protobuf-compiler && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY protos ./protos
COPY service-translation ./service-translation

RUN chmod +x service-translation/Scripts/generate-protos.sh
RUN service-translation/Scripts/generate-protos.sh

WORKDIR /workspace/service-translation
RUN swift build -c release --static-swift-stdlib

FROM ubuntu:22.04 AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libatomic1 libz3-4 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /workspace/service-translation/.build/release/App /app/App

EXPOSE 50051
ENTRYPOINT ["/app/App"]
