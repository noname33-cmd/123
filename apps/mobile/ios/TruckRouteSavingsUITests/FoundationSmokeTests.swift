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
      // Restoring or reading a message may leave the next control above the viewport.
      // Keep the gesture above the numeric keyboard; drag dismisses it.
      let scroll = app.scrollViews.firstMatch
      let viewport = scroll.exists ? scroll.frame.intersection(app.frame) : app.frame
      let isAbove = element.exists && !element.frame.isEmpty && element.frame.minY < viewport.minY + 8
      let from = app.coordinate(withNormalizedOffset: CGVector(dx: 0.85, dy: isAbove ? 0.20 : 0.48))
      let to = app.coordinate(withNormalizedOffset: CGVector(dx: 0.85, dy: isAbove ? 0.48 : 0.20))
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

    // Replace a selection in an already validated, restored native field.
    // Command-A exercises UIKit selection; sending a complete replacement
    // must not append to the old value or reset the native editing buffer.
    let mass = app.textFields["Current gross mass (kg)"].firstMatch
    reveal(mass, in: app)
    XCTAssertEqual(mass.value as? String, "36287.3896")
    mass.tap()
    mass.typeKey("a", modifierFlags: .command)
    mass.typeText("30000.123456789")
    let edited = expectation(for: NSPredicate(format: "value == %@", "30000.123456789"), evaluatedWith: mass)
    wait(for: [edited], timeout: 5)

    // The caret is at the end after typing. Replace only the final three digits.
    for _ in 0..<3 { mass.typeKey(XCUIKeyboardKey.leftArrow, modifierFlags: .shift) }
    mass.typeText("125")
    let partial = expectation(for: NSPredicate(format: "value == %@", "30000.123456125"), evaluatedWith: mass)
    wait(for: [partial], timeout: 5)

    // Exercise the system clipboard using UIKit keyboard commands, not a JS
    // setter or typeText as a substitute for Paste. This stays within one app.
    mass.typeKey("a", modifierFlags: .command)
    mass.typeKey("c", modifierFlags: .command)
    mass.typeText("1")
    let temporary = expectation(for: NSPredicate(format: "value == %@", "1"), evaluatedWith: mass)
    wait(for: [temporary], timeout: 5)
    mass.typeKey("a", modifierFlags: .command)
    mass.typeKey("v", modifierFlags: .command)
    let pasted = expectation(for: NSPredicate(format: "value == %@", "30000.123456125"), evaluatedWith: mass)
    wait(for: [pasted], timeout: 5)
    let invalidated = expectation(for: NSPredicate(format: "enabled == false"),
      evaluatedWith: app.buttons["Save profile on this device"])
    wait(for: [invalidated], timeout: 5)
    XCTAssertFalse(app.buttons["Save profile on this device"].isEnabled, "An edited snapshot must be revalidated")
    XCTAssertFalse(app.staticTexts.matching(NSPredicate(format: "label == %@",
      "Validated SI: height 4.1148 m; width 2.5908 m; length 18.288 m; mass 36287.3896 kg.")).firstMatch.exists)
    tap("Validate profile", in: app)
    expectMessage("Validated SI: height 4.1148 m; width 2.5908 m; length 18.288 m; mass 30000.123456125 kg.", in: app)
    tap("Save profile on this device", in: app)
    expectMessage("Validated snapshot saved on this device.", in: app)
    app.terminate()
    app.launch()
    XCTAssertTrue(app.staticTexts["Truck Route & Savings"].waitForExistence(timeout: 60))
    tap("Restore saved profile", in: app)
    expectMessage("Saved profile restored in m/kg.", in: app)
    expectMessage("Validated SI: height 4.1148 m; width 2.5908 m; length 18.288 m; mass 30000.123456125 kg.", in: app)
    let replaced = XCTAttachment(screenshot: app.screenshot())
    replaced.name = "profile-pasted"
    replaced.lifetime = .keepAlways
    add(replaced)
    tap("Delete saved profile", in: app)
    expectMessage("Saved profile deleted from this device. Current form is unchanged.", in: app)
    app.terminate()
    app.launch()
    XCTAssertTrue(app.staticTexts["Truck Route & Savings"].waitForExistence(timeout: 60))
    tap("Restore saved profile", in: app)
    expectMessage("No saved profile on this device.", in: app)
  }
}
