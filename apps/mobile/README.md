# Mobile shell

Официальный React Native Community Template 0.84.0 получен из npm tarball и адаптирован для pnpm monorepo. Native project/module: TruckRouteSavings; Android applicationId: com.truckroutesavings.

Shell отображает недоступность NavigationEngine. Нет GPS permissions, routing, HERE SDK и авторизации. Тест использует официальный safe-area Jest mock; native runtime этим тестом не проверяется.

Все install/build/run команды и native prerequisites — в корневом README. JS bundle build и native binary build — отдельные проверки. Metro видит workspace root, Gradle использует root node_modules и локальный CLI. Debug key создаётся в ~/.android; release signing не настроен.

Android debug APK для x86_64 и arm64-v8a собраны, подписи и manifests проверены. Device smoke на AOSP API 35 x86_64 emulator прошёл: Activity, живой process, реальные тексты shell и screenshot подтверждены. Детали в docs/audit.md. iOS native Simulator build прошёл в macOS CI (Xcode 16.4, SDK 18.5), включая pod install --deployment. Запуск iOS и ARM-устройств, полные business/device E2E не проверены. Debug APK требует Metro. Перед добавлением HERE необходимо отдельно проверить лицензию и совместимость bridge/native SDK.

## iOS launch/UI smoke

После frozen install, navigation build и `bundle exec pod install --deployment` на macOS задайте UDID отдельного iOS Simulator:

```sh
export IOS_SIMULATOR_UDID="<UUID из xcrun simctl list devices>"
pnpm test:ios
```

Команда запускается из корня workspace, выбирает только указанный Simulator, при необходимости загружает его и выполняет XCTest `FoundationSmokeTests`. Debug JS bundle встраивается через FORCE_BUNDLING=1 (поддерживается установленным RN script); Metro не требуется. Проверяются три точных текста shell, их ненулевые рамки внутри экрана, отсутствие alerts и foreground state. Screenshot и UI hierarchy сохраняются в `.xcresult` под `artifacts/ios-smoke/`, включая ошибки теста после запуска приложения. Команда не удаляет пользовательский Simulator. CI создаёт и удаляет собственный iPhone 16 / iOS 18.5 Simulator, использует Xcode 16.4, сохраняет `.xcresult` и журнал в ios-build-evidence. Native результат этой итерации пока ожидается; локальные script tests не подтверждают iOS runtime.
