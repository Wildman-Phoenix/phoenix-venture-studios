import AppKit
import Foundation
import ImagePlayground

@available(macOS 15.4, *)
@main
struct ImagePlaygroundGenerateTool {
  static func main() async {
    let rawArgs = Array(CommandLine.arguments.dropFirst())
    let parsed = parseArguments(rawArgs)
    guard let parsed else {
      fputs("usage: image-playground-generate.swift [--source-image <path>] <prompt> <output-path> [style]\n", stderr)
      exit(64)
    }

    let prompt = parsed.prompt
    let outputPath = parsed.outputPath
    let requestedStyle = parsed.style
    let statusPath = ProcessInfo.processInfo.environment["PHOENIX_IMAGEPLAYGROUND_STATUS_PATH"]

    do {
      let app = NSApplication.shared
      app.setActivationPolicy(.regular)
      let window = NSWindow(
        contentRect: NSRect(x: 0, y: 0, width: 640, height: 420),
        styleMask: [.titled, .closable],
        backing: .buffered,
        defer: false
      )
      window.title = "Phoenix Local Image Generator"
      window.center()
      window.orderFrontRegardless()
      app.activate(ignoringOtherApps: true)

      let creator = try await ImageCreator()
      let style = pickStyle(named: requestedStyle, available: creator.availableStyles)
      var concepts: [ImagePlaygroundConcept] = [.text(prompt)]
      if let sourceImagePath = parsed.sourceImagePath,
         let sourceConcept = ImagePlaygroundConcept.image(URL(fileURLWithPath: sourceImagePath)) {
        concepts.append(sourceConcept)
      }

      var wroteImage = false
      for try await image in creator.images(for: concepts, style: style, limit: 1) {
        let rep = NSBitmapImageRep(cgImage: image.cgImage)
        guard let data = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.92]) else {
          throw NSError(domain: "PhoenixImagePlayground", code: 2, userInfo: [
            NSLocalizedDescriptionKey: "Unable to encode generated image as JPEG.",
          ])
        }

        let outputUrl = URL(fileURLWithPath: outputPath)
        try FileManager.default.createDirectory(
          at: outputUrl.deletingLastPathComponent(),
          withIntermediateDirectories: true
        )
        try data.write(to: outputUrl)
        window.close()
        let payload = """
{"ok":true,"outputPath":"\(escapeJson(outputPath))","style":"\(escapeJson(style.id))"}
"""
        writeStatus(payload, to: statusPath)
        print(payload)
        wroteImage = true
        break
      }

      if !wroteImage {
        throw NSError(domain: "PhoenixImagePlayground", code: 3, userInfo: [
          NSLocalizedDescriptionKey: "ImagePlayground returned no image.",
        ])
      }
    } catch {
      let message = error.localizedDescription
      let payload = """
{"ok":false,"error":"\(escapeJson(message))"}
"""
      writeStatus(payload, to: statusPath)
      print(payload)
      exit(1)
    }
  }

  static func pickStyle(named requested: String, available: [ImagePlaygroundStyle]) -> ImagePlaygroundStyle {
    if let exact = available.first(where: { $0.id.caseInsensitiveCompare(requested) == .orderedSame }) {
      return exact
    }
    return available.first(where: { $0 == .illustration })
      ?? available.first
      ?? .illustration
  }

  static func escapeJson(_ value: String) -> String {
    value
      .replacingOccurrences(of: "\\", with: "\\\\")
      .replacingOccurrences(of: "\"", with: "\\\"")
      .replacingOccurrences(of: "\n", with: "\\n")
  }

  static func writeStatus(_ payload: String, to path: String?) {
    guard let path, !path.isEmpty else { return }
    try? payload.data(using: .utf8)?.write(to: URL(fileURLWithPath: path))
  }

  static func parseArguments(_ args: [String]) -> (prompt: String, outputPath: String, style: String, sourceImagePath: String?)? {
    var remaining: [String] = []
    var sourceImagePath: String? = nil
    var index = 0

    while index < args.count {
      let value = args[index]
      if value == "--source-image" {
        guard index + 1 < args.count else { return nil }
        sourceImagePath = args[index + 1]
        index += 2
        continue
      }
      remaining.append(value)
      index += 1
    }

    guard remaining.count >= 2 else { return nil }
    return (
      prompt: remaining[0],
      outputPath: remaining[1],
      style: remaining.count >= 3 ? remaining[2] : "illustration",
      sourceImagePath: sourceImagePath
    )
  }
}
