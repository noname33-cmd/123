import XCTest

final class FoundationSmokeTests: XCTestCase {
  func testFoundationShellIsVisible() {
    continueAfterFailure = false
    let app = XCUIApplication()
    app.launch()
    defer {
      let screenshot = XCTAttachment(screenshot: app.screenshot())
      screenshot.name = "foundation-shell"
      screenshot.lifetime = .keepAlways
      add(screenshot)
      let hierarchy = XCTAttachment(string: app.debugDescription)
      hierarchy.name = "foundation-ui-hierarchy"
      hierarchy.lifetime = .keepAlways
      add(hierarchy)
      app.terminate()
    }
    for label in [
      "Truck Route & Savings",
      "Navigation provider is not configured.",
      "Foundation build. Routing and GPS are unavailable.",
    ] {
      let text = app.staticTexts[label]
      XCTAssertTrue(text.waitForExistence(timeout: 60), "Missing shell text: \(label)")
      XCTAssertTrue(text.isHittable, "Shell text is not visible: \(label)")
    }
    XCTAssertEqual(app.state, .runningForeground)
  }
}
