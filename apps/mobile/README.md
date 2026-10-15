# Mobile shell

Официальный React Native Community Template 0.84.0 получен из npm tarball и адаптирован для pnpm monorepo. Native project/module: TruckRouteSavings; Android applicationId: com.truckroutesavings.

Shell отображает недоступность NavigationEngine. Нет GPS permissions, routing, HERE SDK и авторизации. Тест использует официальный safe-area Jest mock; native runtime этим тестом не проверяется.

Все install/build/run команды и native prerequisites — в корневом README. JS bundle build и native binary build — отдельные проверки. Metro видит workspace root, Gradle использует root node_modules и локальный CLI. Debug key создаётся в ~/.android; release signing не настроен.

Android debug APK для x86_64 и arm64-v8a собраны, подписи и manifests проверены. Device smoke на AOSP API 35 x86_64 emulator прошёл: Activity, живой process, реальные тексты shell и screenshot подтверждены. Детали в docs/audit.md. iOS native Simulator build прошёл в macOS CI (Xcode 16.4, SDK 18.5), включая pod install --deployment. Запуск iOS подтверждён XCTest на Simulator (см. ниже); ARM-устройства и полные business/device E2E не проверены. Debug APK требует Metro. Перед добавлением HERE необходимо отдельно проверить лицензию и совместимость bridge/native SDK.

## iOS launch/UI smoke

После frozen install, navigation build и `bundle exec pod install --deployment` на macOS задайте UDID отдельного iOS Simulator:

```sh
export IOS_SIMULATOR_UDID="<UUID из xcrun simctl list devices>"
pnpm test:ios
```

Команда запускается из корня workspace, выбирает только указанный Simulator, при необходимости загружает его и выполняет XCTest `FoundationSmokeTests`. Debug JS bundle встраивается через FORCE_BUNDLING=1 (поддерживается установленным RN script); Metro не требуется. Проверяются три точных текста shell, их ненулевые рамки внутри экрана, отсутствие alerts и foreground state. Screenshot и UI hierarchy сохраняются в `.xcresult` под `artifacts/ios-smoke/`, включая ошибки теста после запуска приложения. Команда не удаляет пользовательский Simulator. CI создаёт и удаляет собственный iPhone 16 / iOS 18.5 Simulator, использует Xcode 16.4, сохраняет `.xcresult` и журнал в ios-build-evidence. [CI run](https://github.com/noname33-cmd/123/actions/runs/38686080630) успешен на коммите 3d7b5af78bde6f5d48fb3700180f5fe38a8de5b1: checks, Android build/UI smoke и iOS build/UI smoke. Выполнены 14 JS unit/component/HTTP/script tests и 1 XCTest (0 failures, 25 секунд). Screenshot и hierarchy экспортированы, скриншот визуально проверен. В Debug виден баннер подключения Metro от RN dev tools; JS bundle уже встроен, сервер Metro для этой проверки не запускался. Проверена только конфигурация iPhone 16 / iOS 18.5 / Xcode 16.4; physical devices, другие iOS версии и release signing не проверены.
