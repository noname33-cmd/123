# Mobile shell

Официальный React Native Community Template 0.84.0 получен из npm tarball и адаптирован для pnpm monorepo. Native project/module: TruckRouteSavings; Android applicationId: com.truckroutesavings.

Shell отображает недоступность NavigationEngine. Нет GPS permissions, routing, HERE SDK и авторизации. Тест использует официальный safe-area Jest mock; native runtime этим тестом не проверяется.

Все install/build/run команды и native prerequisites — в корневом README. JS bundle build и native binary build — отдельные проверки. Metro видит workspace root, Gradle использует root node_modules и локальный CLI. Debug key создаётся в ~/.android; release signing не настроен.

Android debug APK для x86_64 и arm64-v8a собраны, подписи и manifests проверены. Device smoke на AOSP API 35 x86_64 emulator прошёл: Activity, живой process, реальные тексты shell и screenshot подтверждены. Детали в docs/audit.md. Запуск на ARM-устройстве, iOS build и полные business/device E2E ещё не подтверждены. Debug APK требует Metro. Перед добавлением HERE необходимо отдельно проверить лицензию и совместимость bridge/native SDK.
