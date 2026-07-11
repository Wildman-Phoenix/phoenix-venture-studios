import Foundation
import Vision
import CoreGraphics
import ImageIO

struct VisionAuditResult: Encodable {
  let textObservationCount: Int
  let textCoverage: Double
  let faceCount: Int
  let landmarkedFaceCount: Int
  let maxFaceAreaRatio: Double
  let handCount: Int
  let completeHandCount: Int
  let lowConfidenceHandCount: Int
}

func rectArea(_ rect: CGRect) -> Double {
  return Double(rect.width * rect.height)
}

guard CommandLine.arguments.count > 1 else {
  fputs("{\"textObservationCount\":0,\"textCoverage\":0,\"faceCount\":0,\"landmarkedFaceCount\":0,\"maxFaceAreaRatio\":0,\"handCount\":0,\"completeHandCount\":0,\"lowConfidenceHandCount\":0}\n", stderr)
  exit(1)
}

let imagePath = CommandLine.arguments[1]
let url = URL(fileURLWithPath: imagePath)

guard
  let source = CGImageSourceCreateWithURL(url as CFURL, nil),
  let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil)
else {
  fputs("{\"textObservationCount\":0,\"textCoverage\":0,\"faceCount\":0,\"landmarkedFaceCount\":0,\"maxFaceAreaRatio\":0,\"handCount\":0,\"completeHandCount\":0,\"lowConfidenceHandCount\":0}\n", stderr)
  exit(1)
}

let imageArea = Double(cgImage.width * cgImage.height)
let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

let textRequest = VNRecognizeTextRequest()
textRequest.recognitionLevel = .fast
textRequest.usesLanguageCorrection = false

let faceRequest = VNDetectFaceLandmarksRequest()
let handRequest = VNDetectHumanHandPoseRequest()
handRequest.maximumHandCount = 4

do {
  try handler.perform([textRequest, faceRequest, handRequest])
} catch {
  fputs("{\"textObservationCount\":0,\"textCoverage\":0,\"faceCount\":0,\"landmarkedFaceCount\":0,\"maxFaceAreaRatio\":0,\"handCount\":0,\"completeHandCount\":0,\"lowConfidenceHandCount\":0}\n", stderr)
  exit(1)
}

let textObservations = (textRequest.results as? [VNRecognizedTextObservation]) ?? []
let textCoverage = imageArea > 0
  ? textObservations.reduce(0.0) { sum, observation in
      let box = observation.boundingBox
      return sum + rectArea(box)
    }
  : 0.0

let faceObservations = (faceRequest.results as? [VNFaceObservation]) ?? []
let landmarkedFaceCount = faceObservations.filter { $0.landmarks != nil }.count
let maxFaceAreaRatio = faceObservations.map { rectArea($0.boundingBox) }.max() ?? 0.0
let handObservations = (handRequest.results as? [VNHumanHandPoseObservation]) ?? []

let expectedJointNames: [VNHumanHandPoseObservation.JointName] = [
  .wrist,
  .thumbCMC, .thumbMP, .thumbIP, .thumbTip,
  .indexMCP, .indexPIP, .indexDIP, .indexTip,
  .middleMCP, .middlePIP, .middleDIP, .middleTip,
  .ringMCP, .ringPIP, .ringDIP, .ringTip,
  .littleMCP, .littlePIP, .littleDIP, .littleTip,
]

func recognizedJointCount(for observation: VNHumanHandPoseObservation) -> (recognized: Int, lowConfidence: Int) {
  var recognized = 0
  var lowConfidence = 0
  for jointName in expectedJointNames {
    guard let point = try? observation.recognizedPoint(jointName) else { continue }
    if point.confidence >= 0.35 {
      recognized += 1
    } else if point.confidence > 0 {
      lowConfidence += 1
    }
  }
  return (recognized, lowConfidence)
}

let handStats = handObservations.map(recognizedJointCount)
let completeHandCount = handStats.filter { $0.recognized >= 14 }.count
let lowConfidenceHandCount = handStats.filter { $0.lowConfidence >= 4 || $0.recognized < 8 }.count

let result = VisionAuditResult(
  textObservationCount: textObservations.count,
  textCoverage: textCoverage,
  faceCount: faceObservations.count,
  landmarkedFaceCount: landmarkedFaceCount,
  maxFaceAreaRatio: maxFaceAreaRatio,
  handCount: handObservations.count,
  completeHandCount: completeHandCount,
  lowConfidenceHandCount: lowConfidenceHandCount
)

let encoder = JSONEncoder()
encoder.outputFormatting = [.withoutEscapingSlashes]
let data = try encoder.encode(result)
if let json = String(data: data, encoding: .utf8) {
  print(json)
}
