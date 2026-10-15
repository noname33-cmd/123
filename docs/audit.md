# Аудит исходного состояния и фундамент

Дата: 2026-10-14. Область: первая итерация Truck Route & Savings.

## Исходное состояние

Каталог Tracker был пуст, включая скрытые файлы: исходников, документации, AGENTS.md и Git metadata не было. Инициализирован локальный Git, ветка main; commit и remote не создавались.

Исходная среда проверки: Windows, Node 24.19.0. Доступны pnpm 11.25.0 и Docker CLI 29.7.2. npm, Java и adb отсутствовали в PATH; ANDROID_HOME/JAVA_HOME не были заданы. Docker Linux daemon был недоступен. macOS/Xcode в этой среде отсутствуют.

При продолжении Docker daemon доступен. С разрешения пользователя установлены локальные Temurin JDK 17.0.20.1+1, Android command-line tools 19.0, platform API 36, build-tools 35.0.0/36.0.0, NDK 27.1.12297006, CMake 3.22.1 и platform-tools. SDK licenses приняты. Инструменты хранятся вне репозитория; системный PATH не менялся. `adb devices` не обнаружил устройств.

## Реализованный объём

pnpm workspaces + Turborepo, strict TypeScript, NestJS health shell, native React Native Android/iOS shell, NavigationEngine capability interface и недоступный adapter, Compose PostGIS/Redis, unit/component/HTTP tests, CI и документация.

Использован официальный Community Template 0.84.0 из npm tarball. CLI init первоначально не выполнился из-за некорректных bin paths pnpm 11 в данной среде; template распакован и адаптирован напрямую. Для install и корневых проверок использован pnpm 10.28.2 из официального npm tarball через node во временном каталоге вне репозитория. В packageManager зафиксирована эта версия. Локальные абсолютные пути runtime не внесены в конфигурацию проекта.

## Выполненные проверки

Все итоговые проверки ниже успешны:

- Установка зависимостей; повторная установка `pnpm install --frozen-lockfile` с неизменным lockfile.
- `pnpm lint`: три пакета, ошибок и предупреждений lint нет.
- `pnpm typecheck`: API, mobile, navigation.
- `pnpm build`: TypeScript API/navigation, Metro production JS bundles Android и iOS. Итоговые mobile bundles примерно 986 KB и 979 KB; это не native binaries.
- `pnpm test`: 3 tests, все прошли — health controller, unavailable navigation adapter, mobile component.
- `pnpm test:e2e`: 2 HTTP tests, все прошли — health 200 и отсутствующий routes endpoint 404. Suite поднимает Nest application; внешние сервисы не подключаются.
- Собранный API запущен; HTTP GET /health вернул ожидаемый JSON.
- Финальная `pnpm dev:api` через tsc-watch запущена; компиляция без ошибок, HTTP GET /health успешен.
- Metro запущен через dev:mobile; /status вернул packager-status:running.
- React Native CLI config обнаруживает Android/iOS проекты и safe-area native dependency из workspace root.
- Compose config успешно валидирован с временным паролем из локальной переменной.
- CI YAML успешно разбирается; содержит jobs checks, android, ios.
- Frozen install в отдельном новом каталоге без node_modules, затем build, lint, typecheck, 3 unit/component tests и 2 HTTP E2E tests — успешны. Это проверка чистого workspace на той же Windows машине, с доступным package cache.
- PostgreSQL/PostGIS и Redis успешно подняты из пустых volumes, healthchecks прошли. Проверены TCP-соединение PostgreSQL с паролем через container network, PostGIS geography distance в метрах и Redis PING/write/read. Неверный PostgreSQL пароль отдельно проверен и отклонён.
- Docker images закреплены по digest. Повторный запуск этих images с пустыми volumes и smoke test успешен.
- `test:scripts`: 2 tests прошли — отказ при неверном spatial result и cleanup Redis probe при ошибке чтения.

Добавлена команда `pnpm test:infra`; она используется и в CI. Найдена и исправлена гонка healthcheck: socket readiness могла срабатывать во время временного init-сервера. Healthcheck теперь ждёт TCP. Все временные контейнеры/volumes проекта после smoke tests удалены, другие Docker проекты не менялись.

Для native проверки создана отдельная копия workspace с ASCII-путём. Gradle distribution 9.0.0 работает; его SHA-256 зафиксирован по официальному checksum. JVM loopback error устранена локальным `jdk.net.unixdomain.tmpdir` с коротким ASCII-путём. CLI latest изменил поведение sdkmanager, поэтому CI закрепляет tools build 13114758 (19.0). Загрузка SDK через Java была прервана; официальные архивы установлены с проверкой checksum. Android codegen и autolinking прошли.

Первая попытка native build дошла до CMake и упала на Prefab ClassNotFoundException: сгенерированный batch-файл содержал кириллицу в Gradle cache path. После переноса `GRADLE_USER_HOME` в ASCII-каталог `assembleDebug -PreactNativeArchitectures=x86_64 --max-workers=2 --no-daemon` завершился **BUILD SUCCESSFUL**. Компиляция Kotlin/Java/C++, codegen, linking и APK packaging прошли.

APK x86_64 сохранён в `artifacts/android/app-debug-x86_64.apk`, 33 822 705 bytes. SHA-256: `2903a2a2df1a9c38f958688055456dcc862e6d528d3d34f2edef063463d57668`. `apksigner verify --verbose` успешен, signature scheme v2. `aapt2 dump badging`: package `com.truckroutesavings`, versionCode 1, versionName 1.0, min SDK 24, target SDK 36, ABI только x86_64. GPS permissions отсутствуют. Debug APK требует Metro для JS; автономный production APK не создавался. CI сохраняет аналогичный debug APK как artifact.

Для повторения на подготовленной проверочной машине: workspace `C:/Users/Public/TruckRouteSavings-validation-aa028086`; JAVA_HOME `C:/Users/Public/TruckRouteSavings-tools/java/jdk-17.0.20.1+1`; ANDROID_HOME `C:/Users/Public/TruckRouteSavings-tools/android-sdk`; GRADLE_USER_HOME `C:/Users/Public/TruckRouteSavings-tools/gradle-home`. Эти environment variables применялись только к процессу. Локальный JAVA_TOOL_OPTIONS использовал `-Djdk.net.unixdomain.tmpdir=C:/Users/Public/TruckRouteSavings-tools/tmp -Djava.io.tmpdir=C:/Users/Public/TruckRouteSavings-tools/tmp -Dhttps.protocols=TLSv1.2 -Dorg.gradle.internal.http.socketTimeout=30000 -Dorg.gradle.internal.http.connectionTimeout=30000`. Каталоги инструментов и debug keystore находятся вне репозитория. Логи сохранены в `C:/Users/Public/TruckRouteSavings-tools/android-build-ascii.log`.

При следующем продолжении validation workspace перемещён в короткий каталог `C:/Users/Public/trs-v-aa028086`: ARM64 build первоначально упал на длинном Ninja object path, а перенос потребовал пересоздания generated autolinking/build cache. Исходный репозиторий не перемещался. После исправления среды `assembleDebug -PreactNativeArchitectures=arm64-v8a --max-workers=2 --no-daemon` завершился BUILD SUCCESSFUL. ARM64 APK сохранён в `artifacts/android/app-debug-arm64-v8a.apk`, 34 112 418 bytes, SHA-256 `6c50daa6e6c0e575cd4bfdd61117c49f9f0d5851d1039e6435c27837a000a71e`. Signature v2 и manifest проверены: ABI arm64-v8a, min SDK 24, target SDK 36. На ARM-устройстве не запускался.

Android Emulator 37.3.4 (build 16555280) и AOSP API 35 default x86_64 system image rev 2 установлены из официальных ZIP с проверкой checksum. WHPX был включён и подтверждён `emulator -accel-check`; Windows settings не менялись. После неудачной Java SDK-загрузки metadata установленного Emulator восстановлена из официальной remotePackage записи со сверкой revision 37.3.4; AVD manager успешно создал Pixel 6 AVD `TruckFoundationApi35`. AVD расположен в `C:/Users/Public/TruckRouteSavings-tools/avd`.

`pnpm test:android` дважды прошёл на `emulator-5580` с Metro: APK проверен до установки, Activity стартовала, процесс жив, все три текста найдены в реальном UI hierarchy. Screenshot визуально проверен: заголовок и оба сообщения видимы, текст не обрезан. Evidence: `artifacts/android-smoke/screen.png`, `ui.xml`, `app.log`. В последних 200 строках текущего PID не обнаружены заданные fatal/JS markers; это ограниченная smoke-проверка, не доказательство отсутствия всех ошибок. Реальный GPS/routing не выполнялся.

Новая smoke-команда покрыта 4 unit tests (явный serial, неверный package name, отказ на loading/redbox, XML escaped labels). Всего `test:scripts` теперь выполняет 6 tests; все прошли. Общий lint расширен на scripts/*.cjs и прошёл. YAML CI с Emulator Runner и evidence upload разбирается, но GitHub workflow не запускался. Корневые команды этой итерации выполнены portable pnpm 10.28.2 из `C:/Users/Public/TruckRouteSavings-tools/pnpm10/package/bin/pnpm.cjs`: предыдущий temporary runtime больше не доступен, bundled pnpm 11 попытался auto-install и остановился до purge из-за отсутствия TTY.

Проблемы, исправленные при проверках: Metro не видел root node_modules; добавлен workspace watchFolder. SafeAreaProvider не рендерил content в Jest без native metrics; подключён mock, поставляемый библиотекой. Все перечисленные тесты повторно прошли после исправлений. Запущенные процессы остановлены после smoke checks.

## Невыполненные проверки и открытые риски

- Android release binary, 32-bit ABIs и запуск на физическом ARM-устройстве не проверены. Debug x86_64/arm64-v8a builds и signature/manifest inspection прошли; runtime smoke выполнен только на API 35 x86_64 AVD.
- CocoaPods install, Xcode native build и запуск на simulator/device: не выполнены, требуется macOS/Xcode.
- GitHub Actions не запускался: нет remote/публикации. YAML parsing не подтверждает успех workflow.
- Установка на отдельной физической машине не выполнялась; проверены чистый Windows workspace и изолированный Linux container без package cache.
- Реализован и выполнен только Android launch/UI smoke. Полные business E2E, другие API levels и физические устройства не проверены; iOS runtime не проверен.
- Gemfile.lock создан и frozen install проверен в Linux. Podfile.lock и Gradle dependency lockfiles по-прежнему отсутствуют; полную воспроизводимость native builds пока заявлять нельзя.
- ESLint 8 и ряд transitive dependencies deprecated; версия сохранена для совместимости RN template, миграцию следует проверить отдельно.
- Native build выдаёт предупреждения о Gradle APIs, несовместимых с будущим Gradle 10, и SDK XML version 4 при parser version 3. На текущем Gradle 9.0.0 сборка успешна; обновление toolchain требует отдельной проверки.
- HERE Navigate licence, SDK methods, bridge и native version compatibility не проверялись. HERE не устанавливался, интеграция не заявляется.
- Backend не использует PostgreSQL/Redis. Prisma/PostGIS migrations, BullMQ, Next.js admin, auth, truck routing, GPS и financial domain остаются отдельными будущими задачами.
- Production signing, deployment и production Redis authentication не настроены. Compose предназначен для локальной разработки и слушает только loopback.

## Критерий завершения

JS-фундамент проверен в чистых Windows/Linux workspace, infrastructure runtime подтверждён, Android debug x86_64/arm64 APK собраны, x86_64 shell реально запущен на AVD. Всего прошли 11 unit/component/HTTP/script tests плюс Android device smoke и infrastructure runtime checks. Полный критерий задачи пока **не подтверждён**: остаются iOS native build/runtime и фактический GitHub CI run. GitHub подключён, но целевой репозиторий ещё не выбран и публикация исходников не разрешена; macOS runner отдельно не предоставлен. Следующий шаг — выбрать репозиторий для CI или macOS runner, выполнить проверки и получить native lockfiles. Реальная HERE/GPS интеграция не добавляется.

## Продолжение 2026-10-15: Linux и Ruby reproducibility

В изолированном Linux-контейнере Debian Bookworm / Node 22.22.0 выполнены frozen install, lint, typecheck, API/navigation build, Android/iOS JS bundles и все 11 unit/component/HTTP/script tests. Контейнер начинал без node_modules и pnpm cache; исходный Windows checkout монтировался через readonly source snapshot, установка выполнялась внутри контейнера. Image: `node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94`. Это проверка Linux JS-пайплайна, не GitHub Actions run.

Из исходного Gemfile без изменения ограничений создан Gemfile.lock с Darwin Intel/ARM platforms. Ruby 3.3.12 зафиксирован в `.ruby-version` и CI; Bundler 2.5.22 — в lockfile и CI. В отдельном Linux-контейнере frozen bundle install, bundle check и Ruby require CocoaPods/Xcodeproj успешны: 45 gems, CocoaPods 1.15.2, Xcodeproj 1.25.1. SHA-256 lockfile до/после frozen install совпадает: `1ad9ce8f5cfbf9829c4d3e502179d641dcaf9d5ae273e69481718d3b7133fc97`. Image: `ruby:3.3-slim-bookworm@sha256:2e32876dfe84913ec84eb4a59617f72dab7c0989d38f8219487491e384543975`. Native extensions компилировались внутри контейнера; host Ruby не устанавливался. Darwin install, pod install и Xcode build не выполнялись и этим результатом не подтверждаются.

GitHub интеграция подключена; профиль и доступ к репозиториям подтверждены read-only запросами. Репозиторий по имени проекта не найден. Доступен пустой публичный `noname33-cmd/123`, но он ещё не выбран пользователем для Tracker. Ни remote, ни публикация файлов, ни GitHub CI run не выполнялись. Для следующего шага требуется выбор целевого репозитория и разрешение на публикацию подготовленных исходников/CI либо доступ к macOS runner. Все временные Linux/Ruby контейнеры завершены и удалены.

Файлы этой итерации: `apps/mobile/.ruby-version`, `apps/mobile/Gemfile.lock`, `.github/workflows/ci.yml`, `README.md`, `docs/audit.md`. Исходники приложения не менялись, новые feature modules не добавлялись.

## Перечень созданных файлов

При продолжении изменены: `package.json`, `scripts/verify-infra.cjs`, `scripts/verify-infra.test.cjs`, `infra/compose.yaml`, `.github/workflows/ci.yml`, `apps/mobile/android/gradle/wrapper/gradle-wrapper.properties`, `README.md`, `apps/mobile/README.md`, `docs/audit.md`. Добавлены воспроизводимые infra checks, закрепление toolchain/images и результаты native validation.

Текущая итерация: `.eslintrc.cjs`, `.gitignore`, `package.json`, `scripts/verify-android.cjs`, `scripts/verify-android.test.cjs`, `.github/workflows/ci.yml`, `README.md`, `apps/mobile/README.md`, `docs/audit.md`. Изменения касаются Android QA и документации; исходники приложения не менялись. APK и evidence artifacts игнорируются Git.

Все исходные файлы новые. Ниже полный список; generated outputs, node_modules, local Git metadata и внешние инструменты исключены.

- .eslintrc.cjs
- .gitattributes
- .github/workflows/ci.yml
- .gitignore
- .npmrc
- README.md
- apps/api/README.md
- apps/api/jest.config.cjs
- apps/api/package.json
- apps/api/src/app.module.ts
- apps/api/src/bootstrap.ts
- apps/api/src/health.controller.ts
- apps/api/src/main.ts
- apps/api/test/health.e2e.spec.ts
- apps/api/test/health.unit.spec.ts
- apps/api/tsconfig.build.json
- apps/api/tsconfig.json
- apps/mobile/.bundle/config
- apps/mobile/.eslintrc.js
- apps/mobile/.gitignore
- apps/mobile/.prettierrc.js
- apps/mobile/.watchmanconfig
- apps/mobile/App.tsx
- apps/mobile/Gemfile
- apps/mobile/Gemfile.lock
- apps/mobile/.ruby-version
- apps/mobile/README.md
- apps/mobile/__tests__/App.test.tsx
- apps/mobile/android/app/build.gradle
- apps/mobile/android/app/proguard-rules.pro
- apps/mobile/android/app/src/main/AndroidManifest.xml
- apps/mobile/android/app/src/main/java/com/truckroutesavings/MainActivity.kt
- apps/mobile/android/app/src/main/java/com/truckroutesavings/MainApplication.kt
- apps/mobile/android/app/src/main/res/drawable/rn_edit_text_material.xml
- apps/mobile/android/app/src/main/res/mipmap-hdpi/ic_launcher.png
- apps/mobile/android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
- apps/mobile/android/app/src/main/res/mipmap-mdpi/ic_launcher.png
- apps/mobile/android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
- apps/mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
- apps/mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
- apps/mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
- apps/mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
- apps/mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
- apps/mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png
- apps/mobile/android/app/src/main/res/values/strings.xml
- apps/mobile/android/app/src/main/res/values/styles.xml
- apps/mobile/android/build.gradle
- apps/mobile/android/gradle.properties
- apps/mobile/android/gradle/wrapper/gradle-wrapper.jar
- apps/mobile/android/gradle/wrapper/gradle-wrapper.properties
- apps/mobile/android/gradlew
- apps/mobile/android/gradlew.bat
- apps/mobile/android/settings.gradle
- apps/mobile/app.json
- apps/mobile/babel.config.js
- apps/mobile/index.js
- apps/mobile/ios/.xcode.env
- apps/mobile/ios/Podfile
- apps/mobile/ios/TruckRouteSavings.xcodeproj/project.pbxproj
- apps/mobile/ios/TruckRouteSavings.xcodeproj/xcshareddata/xcschemes/TruckRouteSavings.xcscheme
- apps/mobile/ios/TruckRouteSavings/AppDelegate.swift
- apps/mobile/ios/TruckRouteSavings/Images.xcassets/AppIcon.appiconset/Contents.json
- apps/mobile/ios/TruckRouteSavings/Images.xcassets/Contents.json
- apps/mobile/ios/TruckRouteSavings/Info.plist
- apps/mobile/ios/TruckRouteSavings/LaunchScreen.storyboard
- apps/mobile/ios/TruckRouteSavings/PrivacyInfo.xcprivacy
- apps/mobile/jest.config.js
- apps/mobile/metro.config.js
- apps/mobile/package.json
- apps/mobile/scripts/build.cjs
- apps/mobile/tsconfig.json
- docs/audit.md
- infra/compose.yaml
- package.json
- packages/navigation/README.md
- packages/navigation/package.json
- packages/navigation/src/index.ts
- packages/navigation/test/availability.test.cjs
- packages/navigation/tsconfig.json
- pnpm-lock.yaml
- pnpm-workspace.yaml
- scripts/verify-infra.cjs
- scripts/verify-infra.test.cjs
- scripts/verify-android.cjs
- scripts/verify-android.test.cjs
- tsconfig.base.json
- turbo.json
