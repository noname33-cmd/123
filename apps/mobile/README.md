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

## Android dependency locking

Версии project dependency graphs фиксируются в `apps/mobile/android/gradle/dependency-locks/*.lockfile` с `LockMode.STRICT`. Root buildscript classpath фиксируется в `apps/mobile/android/buildscript-gradle.lockfile`; при отсутствии этого файла обычная сборка останавливается. Lock автолинкованной библиотеки хранится в исходниках, вне node_modules.

Из каталога `apps/mobile/android` в подготовленной Android-среде:

```sh
# Проверить graphs и собрать APK без обновления lock state:
bash gradlew resolveDependencyLocks assembleDebug -PreactNativeArchitectures=x86_64 --max-workers=2 --no-daemon

# Только для намеренного обновления зависимостей; затем проверить diff и повторить build/smoke:
bash gradlew resolveDependencyLocks --write-locks -PreactNativeArchitectures=x86_64 --max-workers=2 --no-daemon
```

На Windows используйте `.\gradlew.bat` вместо `bash gradlew` и ASCII-пути, описанные выше. CI разрешает graphs без --write-locks, собирает APK, проверяет неизменность lockfiles и отрицательный сценарий отсутствующего app lock state через `scripts/gradle-missing-lock.init.gradle`. Fixture меняет только конфигурацию одного Gradle invocation и не удаляет файлы.

Команда охватывает resolvable Android graphs (включая Debug, DebugOptimized, Release и test classpaths) с текущим Hermes. Kotlin `*DependenciesMetadata` без Android build type исключены из массового разрешения из-за неоднозначности Debug/Release variants. Strict locking для них остаётся включённым: будущая задача, использующая такую конфигурацию, потребует lock state. Задача разрешает graph, а необходимые build artifacts загружает сборка.

Отдельные границы: settings/plugin-management classpaths, included builds RN Gradle plugin и buildscript classpaths сторонних библиотек не покрыты этими project lockfiles. Их исходные версии закреплены pnpm-lock; отдельный locking этих build contexts и проверка Maven artifact checksums остаются будущими задачами. Release graph resolution не означает выполненную release binary/signing проверку.

[Официальная документация Gradle locking](https://docs.gradle.org/current/userguide/dependency_locking.html); используемые методы ResolutionResult и UnresolvedDependencyResult сверены с установленным Gradle 9.0.0. Локально resolveDependencyLocks + assembleDebug x86_64 прошли без --write-locks (88 tasks, 2m29s). Missing app state и missing root buildscript lock отвергнуты отдельными negative checks; все три lockfile не изменились. Чистый CI этой итерации ещё ожидается.
