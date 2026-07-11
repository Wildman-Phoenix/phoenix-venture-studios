import Foundation
import FoundationModels

struct ReviewInput: Codable {
  let title: String
  let sceneLane: String
  let reviewMode: String
  let blockedReasons: [String]
  let warnings: [String]
  let editorialNotes: [String]
  let recommendedFixes: [String]
  let metrics: [String: Double]
  let vision: [String: Double]
}

let args = Array(CommandLine.arguments.dropFirst())
guard let inputPath = args.first else {
  fputs("usage: foundation-editorial-review.swift <input-json>\n", stderr)
  exit(64)
}

let inputUrl = URL(fileURLWithPath: inputPath)
let inputData = try Data(contentsOf: inputUrl)
let input = try JSONDecoder().decode(ReviewInput.self, from: inputData)
let sem = DispatchSemaphore(value: 0)

Task {
  defer { sem.signal() }
  do {
    let session = LanguageModelSession(instructions: """
You are the Phoenix Venture Studios editorial image critic.
Respond with compact JSON only.
Return this schema exactly:
{"verdict":"approve|revise|reject","storyFit":"strong|medium|weak","headlinePlacementRisk":"low|medium|high","confidence":"low|medium|high","notes":["..."],"fixes":["..."]}
Rules:
- Notes and fixes must each contain 0 to 3 short strings.
- Base the review on story fit, clutter, color energy, visual specificity, and whether the cover sounds like generic filler.
- Do not mention being an AI model.
- If the image already looks strong, keep notes short.
""")

    let prompt = """
Title: \(input.title)
Lane: \(input.sceneLane)
Mode: \(input.reviewMode)
Blocked reasons: \(input.blockedReasons.joined(separator: " | "))
Warnings: \(input.warnings.joined(separator: " | "))
Heuristic notes: \(input.editorialNotes.joined(separator: " | "))
Heuristic fixes: \(input.recommendedFixes.joined(separator: " | "))
Metrics: \(input.metrics)
Vision: \(input.vision)
Give the editorial review JSON now.
"""

    let response = try await session.respond(to: prompt)
    print(response.content.trimmingCharacters(in: .whitespacesAndNewlines))
  } catch {
    let escaped = error.localizedDescription
      .replacingOccurrences(of: "\\", with: "\\\\")
      .replacingOccurrences(of: "\"", with: "\\\"")
      .replacingOccurrences(of: "\n", with: "\\n")
    print("{\"verdict\":\"revise\",\"storyFit\":\"medium\",\"headlinePlacementRisk\":\"medium\",\"confidence\":\"low\",\"notes\":[\"Local editorial review fallback triggered.\"],\"fixes\":[\"\(escaped)\"]}")
  }
}

sem.wait()
