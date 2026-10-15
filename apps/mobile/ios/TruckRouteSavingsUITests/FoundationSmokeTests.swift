import XCTest

final class FoundationSmokeTests: XCTestCase {
  private var app: XCUIApplication?

  override func tearDownWithError() throws {
    if let app = app {
      let screenshot = XCTAttachment(screenshot: app.screenshot())
      screenshot.name = "foundation-shell"
      screenshot.lifetime = .keepAlways
      add(screenshot)
      let hierarchy = XCTAttachment(string: app.debugDescription)
      hierarchy.name = "foundation-ui-hierarchy"
      hierarchy.lifetime = .keepAlways
      add(hierarchy)
      print(app.debugDescription)
      app.terminate()
    }
    try super.tearDownWithError()
  }

  func testFoundationShellIsVisible() {
    continueAfterFailure = false
    let app = XCUIApplication()
    self.app = app
    app.launch()
    for label in [
      "Truck Route & Savings",
      "Navigation provider is not configured.",
      "Foundation build. Routing and GPS are unavailable.",
    ] {
      let matches = app.staticTexts.matching(NSPredicate(format: "label == %@", label))
      XCTAssertTrue(matches.firstMatch.waitForExistence(timeout: 60), "Missing shell text: \(label)")
      // Static text needs no interaction point. Require an on-screen, non-empty frame.
      XCTAssertTrue(matches.allElementsBoundByIndex.contains { text in
        !text.frame.isEmpty && app.frame.contains(text.frame)
      }, "Shell text has no visible frame: \(label)")
    }
    XCTAssertFalse(app.alerts.firstMatch.exists, "An alert is covering the shell")
    XCTAssertEqual(app.state, .runningForeground)
  }
}
