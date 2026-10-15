# Truck Route & Savings

Базовый monorepo для приложения американских truck drivers: shell, health endpoint, граница NavigationEngine и подключение NestJS к PostgreSQL/PostGIS через Prisma adapter. Truck routing, GPS, HERE SDK, пользовательская авторизация, savings и production deployment не реализованы.

## Структура

- `apps/api`: NestJS, `GET /health` — liveness процесса, не readiness PostgreSQL/Redis.
- `apps/mobile`: React Native 0.84.0, TypeScript, native Android/iOS; отображает недоступность navigation.
- `packages/navigation`: интерфейс capability и UnavailableNavigationEngine; нет выдуманных методов HERE.
- `packages/database`: DatabaseConnection port, Prisma 7.10.0 / PostgreSQL adapter, проверка PostGIS при старте API. Бизнес-моделей и migrations пока нет.
- `infra`: локальные PostgreSQL 17/PostGIS 3.5 и Redis 7.4.
- `docs/audit.md`: исходное состояние, результаты и ограничения проверок.
- `.github/workflows/ci.yml`: JS, HTTP, infrastructure и native build jobs.

Следующие отдельные модули: `apps/admin` (Next.js), domain-specific Prisma/PostGIS migrations, Redis/BullMQ adapters. Все внешние сервисы подключаются через интерфейсы и адаптеры.

## Установка и JS-проверки

Требуются Node 22.x (>=22.12) или 24.x (CI: 22.22.0), pnpm **10.28.2**, Docker Compose v2 для инфраструктуры. Допустимые major versions ограничены по требованиям Prisma 7; Node 23 не поддерживается. Установите указанную версию pnpm доступным для вашей среды способом. В стандартной Node-installation: `npm install -g pnpm@10.28.2`.

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm test:e2e
pnpm test:scripts
pnpm test:database # Docker: отдельный временный PostGIS, реальный Nest/Prisma и неверный пароль
```

`pnpm build` генерирует Prisma Client, компилирует database/backend/navigation и создаёт Android/iOS **JS bundles** в `apps/mobile/dist`. DATABASE_URL не требуется для генерации, сборки и unit tests. Это не APK и не iOS binary. `pnpm test` запускает unit/component tests; `test:e2e` проверяет HTTP Nest application через Supertest с явной test-only подменой DatabaseConnection. Настоящий PostgreSQL проверяется отдельно через `test:database`.

```sh
# Сначала запустите инфраструктуру и задайте DATABASE_URL по инструкции ниже.
pnpm --filter @truck/database build
pnpm dev:api
# другой терминал: GET http://127.0.0.1:3000/health
pnpm --filter @truck/api start
# start используется после build; не запускайте одновременно на том же порту
```

API слушает loopback, порт задаётся `PORT`. Перед прослушиванием API обязательно подключается к PostgreSQL и выполняет SELECT PostGIS_Lib_Version(). Ошибка конфигурации/пароля/доступности/отсутствие PostGIS останавливает startup; fallback отсутствует. Shutdown hooks закрывают Prisma pool. Единственный endpoint — process liveness; после старта `/health` не проверяет доступность DB, бизнес-endpoints отсутствуют.

## Инфраструктура

Docker daemon должен быть запущен. Пароль задайте локально; реальные секреты не коммитить. PowerShell:

```powershell
$env:POSTGRES_PASSWORD = [guid]::NewGuid().ToString('N')
pnpm infra:check
pnpm infra:up
pnpm test:infra
$env:DATABASE_URL = 'postgresql://truck:' + [uri]::EscapeDataString($env:POSTGRES_PASSWORD) + '@127.0.0.1:5432/truck_route_savings'
pnpm --filter @truck/database build
pnpm dev:api
# После остановки API: pnpm infra:down
```

POSIX shell: `export POSTGRES_PASSWORD="$(openssl rand -hex 24)"`, затем `pnpm infra:up` и `export DATABASE_URL="postgresql://truck:${POSTGRES_PASSWORD}@127.0.0.1:5432/truck_route_savings"` (hex-пароль не требует URL encoding). Затем build database и `pnpm dev:api`. Конфигурация читается из process environment; `.env` автоматически не загружается. Compose публикует порты только на 127.0.0.1. Redis без auth предназначен только для локальной разработки, backend пока к Redis не подключён. Volumes сохраняются при `infra:down`; существующий PostgreSQL volume сохраняет первоначальный пароль — используйте его прежнее значение. Не удаляйте volume ради смены пароля.

`pnpm test:database` не использует DATABASE_URL разработчика, Compose volumes или фиксированный host port: создаёт контейнер с закреплённым digest PostGIS, случайным паролем, анонимным volume и случайным портом только на 127.0.0.1. В finally удаляет только свой контейнер и volume. Проверяются реальный Nest startup/query/shutdown и отказ при неверном пароле. Принудительное завершение Node/хоста может прервать finally; оставшийся контейнер с префиксом `truck-db-integration-` следует проверять и удалять адресно. Команда требует Docker и доступа к image registry; миграций и изменений developer DB не выполняет.

`test:infra` требует запущенных контейнеров: проверяет соединение PostgreSQL с паролем по TCP, PostGIS geography distance в метрах и Redis PING/write/read. Redis probe использует уникальный ключ с TTL и удаляет его после проверки. Docker images закреплены digest; PostgreSQL healthcheck ждёт готовности TCP. `test:scripts` проверяет обработку ошибок smoke-команды.

## Android shell

Сначала выполните `pnpm --filter @truck/navigation build`. Требуются JDK 17, Android Studio/SDK API 36, build-tools 36.0.0, NDK 27.1.12297006, CMake 3.22.1 и настроенные `ANDROID_HOME`, `JAVA_HOME`, PATH. Native versions взяты из официального template 0.84.0. CI использует фиксированные command-line tools 19.0 (build 13114758). pnpm использует hoisted layout; Gradle и Metro явно учитывают root node_modules.

Для Windows native validation используйте каталоги проекта, SDK и `GRADLE_USER_HOME` с ASCII-путями: путь к Gradle cache попадёт в сгенерированные Prefab batch-команды. SDK license нужно принять до установки компонентов. Компоненты устанавливаются через SDK Manager; если Java downloader недоступен, официальные архивы и checksum опубликованы в Google SDK repository metadata. Локальные SDK/JDK paths и debug keys не коммитятся.

Native dependencies также запросили build-tools 35.0.0; CI явно устанавливает обе версии 35.0.0 и 36.0.0, чтобы не полагаться на автоматическую загрузку во время сборки.

Если JVM выдаёт `Unable to establish loopback connection` с `UnixDomainSockets.connect`, задайте короткий ASCII-каталог для временных sockets через `-Djdk.net.unixdomain.tmpdir=<каталог>` в локальном `JAVA_TOOL_OPTIONS`. Каталог нужно создать заранее. Это исправление среды подтвердилось на проверочной машине; параметр описан в [Java networking properties](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/net/doc-files/net-properties.html). Не меняйте глобальную JVM-конфигурацию проекта ради локальной проблемы.

Debug keystore хранится вне репозитория. Один раз создайте его (PowerShell, при установленном JDK):

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE/.android"
keytool -genkeypair -keystore "$env:USERPROFILE/.android/debug.keystore" -storepass android -alias androiddebugkey -keypass android -dname 'CN=Android Debug,O=Android,C=US' -keyalg RSA -keysize 2048 -validity 10000
pnpm dev:mobile
# другой терминал, с запущенным эмулятором:
pnpm --filter @truck/mobile android
# только сборка:
cd apps/mobile/android
./gradlew.bat assembleDebug
# smoke-build только для x86_64 emulator, как в CI:
./gradlew.bat assembleDebug -PreactNativeArchitectures=x86_64 --max-workers=2 --no-daemon
# ARM64 debug build (запуск на ARM-устройстве — отдельная проверка):
./gradlew.bat assembleDebug -PreactNativeArchitectures=arm64-v8a --max-workers=2 --no-daemon
```

На macOS/Linux используйте `$HOME/.android` и `bash gradlew assembleDebug`. Release signing не настроен.

На Windows также нужен короткий checkout path: длинные generated C++ object paths могут остановить Ninja. В проверке ARM64 build прошёл после переноса validation checkout в `C:/Users/Public/trs-v-aa028086` и пересоздания generated build directories/autolinking. При перемещении уже установленного checkout обновите workspace links и generated paths; не используйте старые абсолютные пути из build cache.

## Android device smoke

Проверен запуск shell на AOSP Android API 35 x86_64 emulator (Pixel 6 profile) с Metro. Это одна smoke-проверка запуска и доступности navigation; routing/GPS E2E отсутствуют.

После запуска Metro, загрузки/unlock устройства и сборки debug APK:

```powershell
$env:ANDROID_HOME = 'C:/path/to/android-sdk'
$env:ANDROID_SERIAL = 'emulator-5554' # точный serial из adb devices
$env:ANDROID_APK_PATH = 'C:/path/to/app-debug.apk'
pnpm test:android
```

POSIX: задайте те же переменные через `export`. Нужны adb, aapt2 из build-tools 36.0.0 и запущенный Metro на 8081. При необходимости задайте `ADB_PATH`, `AAPT2_PATH`, `ANDROID_ARTIFACTS_DIR`. Script проверяет package name APK до установки, никогда не выбирает устройство автоматически, устанавливает APK с сохранением app data, настраивает adb reverse и запускает MainActivity.

Успех требует трёх текстов shell в реальном UI hierarchy и живого app process. Screenshot, UI XML и последние 200 строк логов текущего PID сохраняются в `artifacts/android-smoke/` (не коммитятся). Проверка логов обнаруживает указанные fatal/JS error markers; она не доказывает отсутствие любых ошибок. Команда не очищает глобальный logcat и не снимает защищённую блокировку устройства.

Локальный emulator запускается из AVD, созданного через SDK Manager/avdmanager. Перед запуском проверьте `emulator -accel-check`. На проверочной Windows-машине WHPX уже был включён; новых hypervisor drivers и reboot не понадобилось. CI содержит запуск API 35 x86_64 AVD, device smoke и загрузку evidence artifacts, [CI run](https://github.com/noname33-cmd/123/actions/runs/38683058653) прошёл: checks, android, ios. Android device smoke успешен; screenshot проверен.

Официальные инструкции: [Emulator acceleration](https://developer.android.com/studio/run/emulator-acceleration), [Emulator CLI](https://developer.android.com/studio/run/emulator-commandline), [ADB](https://developer.android.com/tools/adb).

## iOS shell (только macOS)

Нужны Xcode ≥16.1 и iOS deployment target ≥15.1; эти минимумы проверены в scripts/cocoapods/helpers.rb установленного React Native 0.84.0. Ruby 3.3.12 зафиксирован в apps/mobile/.ruby-version, Bundler 2.5.22 и Ruby gems — в Gemfile.lock. Lock содержит arm64-darwin и x86_64-darwin. Версии CocoaPods 1.15.2 и Xcodeproj 1.25.1 получены из существующих ограничений Gemfile; pod install и native Simulator build успешно выполнены на macos-15. В CI используется macos-15 с frozen Bundler, iOS job прошёл. Podfile.lock получен из успешного CI build; CI использует pod install --deployment.

```sh
pnpm --filter @truck/navigation build
cd apps/mobile
BUNDLE_FROZEN=true bundle install
cd ios
bundle exec pod install --deployment
xcodebuild -workspace TruckRouteSavings.xcworkspace -scheme TruckRouteSavings -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
# из корня, с Metro в отдельном терминале:
pnpm --filter @truck/mobile ios
```

Обновлять Gemfile.lock следует намеренно через Bundler, проверяя diff и повторяя macOS build; frozen install не должен менять lockfile. Linux frozen install и загрузка Ruby modules CocoaPods/Xcodeproj проверены отдельно, они не подтверждают pod install или Xcode build.

## Проверка в чистом Linux

15 октября 2026 полный JS-пайплайн выполнен в новом Docker-контейнере Node 22.22.0 (Debian Bookworm) без Windows node_modules и package cache: frozen install, lint, typecheck, API/navigation build, Android/iOS JS bundles, unit/component/HTTP/script tests прошли. Проверка использовала только source snapshot по Git inventory, исходный checkout не изменялся. Это подтверждает Linux JS-пайплайн, а не фактический GitHub Actions run или native iOS build.

## Архитектурные ограничения

HERE Navigate не установлен. До интеграции нужно подтвердить лицензию, native SDK/React Native bridge compatibility и официальные truck routing API. Заглушка сообщает недоступность, не строит car routes и не симулирует navigation. Полный контракт routing будет отдельным проверенным решением.

Денежные и truck measurement модели сейчас отсутствуют. При их добавлении: USD minor units в целых значениях/decimal, никогда float; distance в метрах, mass в килограммах, dimensions в метрах, conversions на границе UI с явными единицами. Ограничения маршрутов не задавать без данных провайдера.

## Официальные источники

- [React Native 0.84 environment](https://reactnative.dev/docs/0.84/set-up-your-environment)
- [CLI compatibility](https://github.com/react-native-community/cli#compatibility)
- [Community template 0.84.0](https://www.npmjs.com/package/@react-native-community/template/v/0.84.0)

Состояние проверок и следующий шаг описаны в `docs/audit.md`. Наличие workflow не означает успешный запуск CI или native builds.

Публикация исходников: [noname33-cmd/123](https://github.com/noname33-cmd/123). [Итоговый CI run](https://github.com/noname33-cmd/123/actions/runs/38683058653) прошёл полностью на коммите f0daacc9832e5af17a1c3c1fbd21147fb6c420a7. Проверены frozen install, lint, typecheck, build, 11 tests, PostGIS/Redis, Android native build/UI smoke и iOS native Simulator build (Xcode 16.4, SDK 18.5). iOS runtime позднее подтверждён отдельным XCTest (см. раздел iOS launch/UI smoke). Физические устройства и release signing не проверены.

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

[Официальная документация Gradle locking](https://docs.gradle.org/current/userguide/dependency_locking.html); используемые методы ResolutionResult и UnresolvedDependencyResult сверены с установленным Gradle 9.0.0. Локально resolveDependencyLocks + assembleDebug x86_64 прошли без --write-locks (88 tasks, 2m29s). Missing app state и missing root buildscript lock отвергнуты отдельными negative checks; все три lockfile не изменились. [Чистый CI](https://github.com/noname33-cmd/123/actions/runs/38691647263) на commit ac50fb210d1a5567ac2e4014c866baadf07e9eca прошёл полностью: checks, android, ios. Подтверждены frozen install, lint, typecheck, JS/native builds, 14 JS tests, PostGIS/Redis, Android strict-lock checks и device smoke, 1 iOS XCTest без ошибок. Lockfiles после сборки не изменились. Подключение Prisma добавлено следующим отдельным шагом (описано выше); дополнительные build contexts и Maven checksum verification остаются отдельными границами текущего locking.
