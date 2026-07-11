import Foundation
import FoundationModels

struct CandidateInput: Codable {
  let title: String
  let contentText: String
  let sourceName: String
  let sceneLane: String
  let imageSourceType: String
  let imageAuditJson: String
  let imageCertificationJson: String
}

struct SeatReview: Codable {
  let role: String
  let verdict: String
  let confidence: String
  let notes: [String]
  let fixes: [String]
}

struct OutputPayload: Codable {
  let allApproved: Bool
  let reviews: [SeatReview]
}

let seats: [(role: String, instructions: String)] = [
  (
    "copy_expert",
    """
    You are the Phoenix copy expert.
    Judge only the written story copy.
    Approve only if the copy is founder-useful, specific, concise, and not generic.
    Reject if it feels templated, padded, vague, repetitive, or weak at the opening.
    """
  ),
  (
    "editorial_expert",
    """
    You are the Phoenix editorial expert.
    Judge the story framing and whether the signal actually earns attention.
    Approve only if the headline and copy feel like a sharp editorial signal, not content sludge.
    Reject if the angle feels hollow, overstated, or disconnected from the actual story.
    """
  ),
  (
    "art_director",
    """
    You are the Phoenix art director.
    Judge the image using the audit data as if you are approving a social/editorial cover.
    Approve only if the image sounds specific, readable, dynamic, and non-generic.
    Reject if it sounds flat, cluttered, stock-like, or mismatched to the story tension.
    """
  ),
  (
    "editorial_director",
    """
    You are a high-end magazine editorial director.
    Judge the total package: headline, copy, image audit, and share-worthiness.
    Approve only if this feels premium, intentional, and worthy of public release.
    Reject if any part feels cheap, generic, confusing, or not up to magazine level.
    """
  )
]

func rolePrompt(for role: String, instructions: String, candidate: CandidateInput) -> String {
  return """
  \(instructions)

  Respond with compact JSON only using this exact schema:
  {"role":"\(role)","verdict":"approve|revise|reject","confidence":"low|medium|high","notes":["..."],"fixes":["..."]}

  Candidate title: \(candidate.title)
  Source: \(candidate.sourceName)
  Scene lane: \(candidate.sceneLane)
  Image source type: \(candidate.imageSourceType)
  Story copy:
  \(candidate.contentText)

  Image audit:
  \(candidate.imageAuditJson)

  Image certification:
  \(candidate.imageCertificationJson)
  """
}

let args = Array(CommandLine.arguments.dropFirst())
guard let inputPath = args.first else {
  fputs("usage: four-seat-approval.swift <input-json>\n", stderr)
  exit(64)
}

let inputData = try Data(contentsOf: URL(fileURLWithPath: inputPath))
let candidate = try JSONDecoder().decode(CandidateInput.self, from: inputData)
let sem = DispatchSemaphore(value: 0)

Task {
  defer { sem.signal() }
  do {
    var reviews: [SeatReview] = []
    for seat in seats {
      let session = LanguageModelSession()
      let response = try await session.respond(to: rolePrompt(for: seat.role, instructions: seat.instructions, candidate: candidate))
      let data = Data(response.content.utf8)
      let review = try JSONDecoder().decode(SeatReview.self, from: data)
      reviews.append(review)
    }
    let payload = OutputPayload(
      allApproved: reviews.allSatisfy { $0.verdict == "approve" },
      reviews: reviews
    )
    let output = try JSONEncoder().encode(payload)
    print(String(data: output, encoding: .utf8) ?? "{\"allApproved\":false,\"reviews\":[]}")
  } catch {
    let fallback = OutputPayload(
      allApproved: false,
      reviews: seats.map {
        SeatReview(role: $0.role, verdict: "revise", confidence: "low", notes: ["Four-seat approval fallback triggered."], fixes: [error.localizedDescription])
      }
    )
    let output = try! JSONEncoder().encode(fallback)
    print(String(data: output, encoding: .utf8)!)
  }
}

sem.wait()
