#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVICE_DIR="$ROOT_DIR/service-translation"
PROTO_DIR="$ROOT_DIR/protos"
OUT_DIR="$SERVICE_DIR/Sources/App/Generated"
PLUGIN_DIR="$SERVICE_DIR/.build/protoc-plugins"

mkdir -p "$OUT_DIR"
mkdir -p "$PLUGIN_DIR"

if [ ! -x "$PLUGIN_DIR/protoc-gen-swift" ]; then
  rm -rf /tmp/swift-protobuf
  git clone --depth 1 --branch 1.25.0 https://github.com/apple/swift-protobuf.git /tmp/swift-protobuf
  swift build --package-path /tmp/swift-protobuf -c release --product protoc-gen-swift
  cp /tmp/swift-protobuf/.build/release/protoc-gen-swift "$PLUGIN_DIR/protoc-gen-swift"
fi

if [ ! -x "$PLUGIN_DIR/protoc-gen-grpc-swift" ]; then
  rm -rf /tmp/grpc-swift
  git clone --depth 1 --branch 1.21.0 https://github.com/grpc/grpc-swift.git /tmp/grpc-swift
  swift build --package-path /tmp/grpc-swift -c release --product protoc-gen-grpc-swift
  cp /tmp/grpc-swift/.build/release/protoc-gen-grpc-swift "$PLUGIN_DIR/protoc-gen-grpc-swift"
fi

PROTOC_GEN_SWIFT="$PLUGIN_DIR/protoc-gen-swift"
PROTOC_GEN_GRPC_SWIFT="$PLUGIN_DIR/protoc-gen-grpc-swift"

protoc \
  --plugin="protoc-gen-swift=$PROTOC_GEN_SWIFT" \
  --plugin="protoc-gen-grpc-swift=$PROTOC_GEN_GRPC_SWIFT" \
  --swift_out="$OUT_DIR" \
  --grpc-swift_out="$OUT_DIR" \
  --proto_path="$PROTO_DIR" \
  "$PROTO_DIR/translation.proto"
