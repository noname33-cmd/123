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

  private func reveal(_ element: XCUIElement, in app: XCUIApplication, interactive: Bool = true) {
    for _ in 0..<20 {
      if element.exists && !element.frame.isEmpty && app.frame.contains(element.frame) &&
          (!interactive || element.isHittable) { return }
      // Drag above the numeric keyboard; ScrollView dismisses it on drag.
      let from = app.coordinate(withNormalizedOffset: CGVector(dx: 0.85, dy: 0.48))
      let to = app.coordinate(withNormalizedOffset: CGVector(dx: 0.85, dy: 0.20))
      from.press(forDuration: 0.1, thenDragTo: to)
    }
    XCTAssertTrue(element.exists && !element.frame.isEmpty && app.frame.contains(element.frame) &&
      (!interactive || element.isHittable), "Control is not visible: \(element)")
  }

  private func tap(_ title: String, in app: XCUIApplication) {
    let button = app.buttons[title].firstMatch
    reveal(button, in: app)
    XCTAssertTrue(button.isEnabled)
    button.tap()
  }

  private func expectMessage(_ label: String, in app: XCUIApplication) {
    let text = app.staticTexts.matching(NSPredicate(format: "label == %@", label)).firstMatch
    XCTAssertTrue(text.waitForExistence(timeout: 15), "Missing message: \(label)")
    reveal(text, in: app, interactive: false)
  }

  func testSavedProfileSurvivesRestartAndDeletion() {
    continueAfterFailure = false
    let app = XCUIApplication()
    self.app = app
    app.launch()
    XCTAssertTrue(app.staticTexts["Truck Route & Savings"].waitForExistence(timeout: 60))
    // Refuse to overwrite an existing snapshot on a non-disposable simulator.
    tap("Restore saved profile", in: app)
    expectMessage("No saved profile on this device.", in: app)
    app.terminate()
    app.launch()
    XCTAssertTrue(app.staticTexts["Truck Route & Savings"].waitForExistence(timeout: 60))
    tap("Rigid truck — no trailer", in: app)
    for (label, value) in [
      ("Profile name", "Synthetic iOS"), ("Overall height (m)", "4.1148"),
      ("Overall width (m)", "2.5908"), ("Overall length (m)", "18.288"),
      ("Current gross mass (kg)", "36287.3896"), ("Total physical axles", "5"),
    ] {
      let field = app.textFields[label].firstMatch
      reveal(field, in: app)
      field.tap()
      // Send the entire string without per-character synchronization.
      // This reproduced dropped decimal digits with controlled inputs.
      field.typeText(value)
      let updated = expectation(for: NSPredicate(format: "value == %@", value), evaluatedWith: field)
      wait(for: [updated], timeout: 5)
      XCTAssertEqual(field.value as? String, value)
    }
    tap("Validate profile", in: app)
    expectMessage("Profile format is valid. Road legality is not verified.", in: app)
    tap("Save profile on this device", in: app)
    expectMessage("Validated snapshot saved on this device.", in: app)
    app.terminate()
    app.launch()
    XCTAssertTrue(app.staticTexts["Truck Route & Savings"].waitForExistence(timeout: 60))
    tap("Restore saved profile", in: app)
    expectMessage("Saved profile restored in m/kg.", in: app)
    expectMessage("Validated SI: height 4.1148 m; width 2.5908 m; length 18.288 m; mass 36287.3896 kg.", in: app)
    let restored = XCTAttachment(screenshot: app.screenshot())
    restored.name = "profile-restored"
    restored.lifetime = .keepAlways
    add(restored)
    tap("Delete saved profile", in: app)
    expectMessage("Saved profile deleted from this device. Current form is unchanged.", in: app)
    app.terminate()
    app.launch()
    XCTAssertTrue(app.staticTexts["Truck Route & Savings"].waitForExistence(timeout: 60))
    tap("Restore saved profile", in: app)
    expectMessage("No saved profile on this device.", in: app)
  }
}
