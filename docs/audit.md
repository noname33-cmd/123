# Аудит исходного состояния и фундамент

Дата исходного аудита: 2026-10-14; актуализация: 2026-10-15. Область: первая итерация Truck Route & Savings.

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

Новая smoke-команда покрыта 4 unit tests (явный serial, неверный package name, отказ на loading/redbox, XML escaped labels). Всего `test:scripts` теперь выполняет 6 tests; все прошли. Общий lint расширен на scripts/*.cjs и прошёл. На этом этапе YAML CI с Emulator Runner и evidence upload разбирался; итоговый GitHub run приведён ниже. Корневые команды этой итерации выполнены portable pnpm 10.28.2 из `C:/Users/Public/TruckRouteSavings-tools/pnpm10/package/bin/pnpm.cjs`: предыдущий temporary runtime больше не доступен, bundled pnpm 11 попытался auto-install и остановился до purge из-за отсутствия TTY.

Проблемы, исправленные при проверках: Metro не видел root node_modules; добавлен workspace watchFolder. SafeAreaProvider не рендерил content в Jest без native metrics; подключён mock, поставляемый библиотекой. Все перечисленные тесты повторно прошли после исправлений. Запущенные процессы остановлены после smoke checks.

## Невыполненные проверки и открытые риски

- Android release binary, 32-bit ABIs и запуск на физическом ARM-устройстве не проверены. Debug x86_64/arm64-v8a builds и signature/manifest inspection прошли; runtime smoke выполнен только на API 35 x86_64 AVD.
- CocoaPods install и Xcode native Simulator build прошли на macos-15. Запуск и UI smoke прошли на iPhone 16 Simulator / iOS 18.5; физическое iOS-устройство не проверено.
- Установка на отдельной физической машине не выполнялась; проверены чистый Windows workspace и изолированный Linux container без package cache.
- Реализованы и выполнены Android launch/UI smoke и iOS XCTest smoke. Полные business E2E, другие API levels и физические устройства не проверены; iOS runtime подтверждён XCTest на одной конфигурации Simulator (итог ниже).
- Gemfile.lock создан и frozen install проверен в Linux. Podfile.lock получен из успешного macOS CI build и добавлен в исходники; CI использует pod install --deployment. Project Gradle dependency graphs и root buildscript classpath зафиксированы; included/plugin-management/library buildscript contexts остаются отдельными границами. Побайтовая воспроизводимость всех native artifacts не заявляется.
- ESLint 8 и ряд transitive dependencies deprecated; версия сохранена для совместимости RN template, миграцию следует проверить отдельно.
- Native build выдаёт предупреждения о Gradle APIs, несовместимых с будущим Gradle 10, и SDK XML version 4 при parser version 3. На текущем Gradle 9.0.0 сборка успешна; обновление toolchain требует отдельной проверки.
- HERE Navigate licence, SDK methods, bridge и native version compatibility не проверялись. HERE не устанавливался, интеграция не заявляется.
- Backend не использует PostgreSQL/Redis. Prisma/PostGIS migrations, BullMQ, Next.js admin, auth, truck routing, GPS и financial domain остаются отдельными будущими задачами.
- Production signing, deployment и production Redis authentication не настроены. Compose предназначен для локальной разработки и слушает только loopback.

## Критерий завершения

JS-фундамент проверен в чистых Windows/Linux workspace, infrastructure runtime подтверждён, Android debug x86_64/arm64 APK собраны, x86_64 shell реально запущен на AVD. Всего прошли 14 unit/component/HTTP/script tests, 1 iOS XCTest, Android device smoke и infrastructure runtime checks. Установка, сборки, тесты и запуск backend/Android подтверждены локально и в чистом CI. iOS native Simulator build и launch/UI smoke также прошли (run 38686080630). Исходники опубликованы с разрешения пользователя. Следующий отдельный шаг — Prisma/PostgreSQL backend module с integration test; release builds, physical devices и оставшиеся Gradle build contexts остаются за пределами подтверждённых проверок. Реальная HERE/GPS интеграция не добавляется.

## Продолжение 2026-10-15: Linux и Ruby reproducibility

В изолированном Linux-контейнере Debian Bookworm / Node 22.22.0 выполнены frozen install, lint, typecheck, API/navigation build, Android/iOS JS bundles и все 11 unit/component/HTTP/script tests. Контейнер начинал без node_modules и pnpm cache; исходный Windows checkout монтировался через readonly source snapshot, установка выполнялась внутри контейнера. Image: `node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94`. Это проверка Linux JS-пайплайна, не GitHub Actions run.

Из исходного Gemfile без изменения ограничений создан Gemfile.lock с Darwin Intel/ARM platforms. Ruby 3.3.12 зафиксирован в `.ruby-version` и CI; Bundler 2.5.22 — в lockfile и CI. В отдельном Linux-контейнере frozen bundle install, bundle check и Ruby require CocoaPods/Xcodeproj успешны: 45 gems, CocoaPods 1.15.2, Xcodeproj 1.25.1. SHA-256 lockfile до/после frozen install совпадает: `1ad9ce8f5cfbf9829c4d3e502179d641dcaf9d5ae273e69481718d3b7133fc97`. Image: `ruby:3.3-slim-bookworm@sha256:2e32876dfe84913ec84eb4a59617f72dab7c0989d38f8219487491e384543975`. Native extensions компилировались внутри контейнера; host Ruby не устанавливался. Darwin install, pod install и Xcode build не выполнялись и этим результатом не подтверждаются.

С разрешения пользователя опубликованы 87 исходных файлов в публичный репозиторий [noname33-cmd/123](https://github.com/noname33-cmd/123). Коммит `370dfe80dd66bde12d356e263a28e94a8f10321a`, [CI run 38681590319](https://github.com/noname33-cmd/123/actions/runs/38681590319). Первый Android job завершился таймаутом ADB без KVM; исправление и успешный итоговый run описаны ниже. APK, screenshots, node_modules, локальные SDK и ключи исключены. Все временные Linux/Ruby контейнеры завершены и удалены.

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

## GitHub native validation 2026-10-15

В runs 38681590319 и 38681772864 jobs checks и ios прошли. Native Simulator build: **BUILD SUCCEEDED**, CocoaPods 1.15.2; iOS runtime не проверен. Podfile.lock извлечён из ios-build-evidence второго run; SHA-256 ZIP совпал с GitHub artifact digest ef05464f47da5fddba6a05b33aad3d2113b136d15489238e00d11ca718d97f70. Lock не содержит абсолютных runner paths. Android APK собран; итоговый emulator smoke после настройки KVM прошёл (см. ниже).

## Итог CI 2026-10-15

[Run 38683058653](https://github.com/noname33-cmd/123/actions/runs/38683058653), commit `f0daacc9832e5af17a1c3c1fbd21147fb6c420a7`: все jobs **success**.

- checks: frozen pnpm install, lint, typecheck, API/navigation build, Android/iOS JS bundles, 3 unit/component + 2 HTTP + 6 script tests (всего 11), PostGIS authenticated TCP/geography и Redis PING/write/read.
- android: native debug x86_64 APK, KVM acceleration check, AOSP API 35 emulator, Activity/process/UI labels smoke. Screenshot из CI визуально проверен: все сообщения видимы без обрезки. Evidence сохраняется в artifacts CI; локальная копия artifacts/ci-android исключена из Git.
- ios: frozen Bundler, pod install --deployment, native Debug Simulator build без signing. Xcode 16.4 / iPhone Simulator SDK 18.5. Podfile.lock SHA-256 до/после совпал: 2604b1449eb53cb7ee5f862b49ead415f3006b50a5fe1f050d527568633de3d3. iOS runtime не проверен.

Artifacts: android-debug-x86_64, android-smoke-evidence (ZIP SHA-256 3127f141cd63fb9f054e27cf7962ec5b84608d50ddcf298eacab7a41c7ef205e), ios-build-evidence (ZIP SHA-256 6caf3bea4dbb290dd2563b3d7be3ebcfcf6599b31be1d9e325337d9317ba807c). Скачанные evidence ZIP сверены с GitHub digests.

Исправления CI: у Ubuntu runner изначально не было прав на /dev/kvm, action отключал ускорение; emulator boot занял около 7 минут и ADB smoke завершился timeout. Устройство KVM теперь доступно только текущему runner user (mode 600); -accel-check подтвердил KVM version 12, AVD boot занял около 32 секунд. Следующий промежуточный run выявил отсутствие Emulator binary до accel-check; пакет emulator добавлен в явный sdkmanager install. Успешный итоговый run проверил оба исправления. Прежние неудачные runs сохранены в GitHub для аудита.

Изменения продолжения: .github/workflows/ci.yml, apps/mobile/ios/Podfile.lock, apps/mobile/android/gradlew.bat (нормализация строк), README.md, apps/mobile/README.md, docs/audit.md. Опубликовано 88 файлов исходников. Документационный итоговый commit использует [skip ci], поскольку меняет только описание уже проверенного состояния.

## Продолжение: iOS launch/UI smoke

Добавлен реальный UI-test target TruckRouteSavingsUITests вместо ссылки scheme на отсутствующий TruckRouteSavingsTests. Один XCTest запускает приложение, ожидает три текста shell, проверяет ненулевые рамки текста внутри app frame, отсутствие alerts и runningForeground, сохраняет screenshot/hierarchy в xcresult. Добавлена команда test:ios, явный simulator UUID, отказ для неподходящих/недоступных устройств. CI использует отдельный Simulator, встраивает JS bundle без Metro и сохраняет evidence.

Локально: 9 script tests (6 существующих + 3 новых) и lint scripts прошли; git diff --check успешен. На этом этапе native результат ожидался; Swift compile, XCTest и iOS runtime впоследствии подтверждены в итоговом run ниже. Новые product modules и SDK не добавлены.

Промежуточные проверки: первый native test build выявил пустой PRODUCT_NAME у UI-test target — исправлено для Debug/Release. Второй run скомпилировал и выполнил 1 XCTest: заголовок существовал, но isHittable=false. Запись экрана извлечена из сохранённого xcresult, визуально подтверждены все три текста без обрезки. Для статического текста проверка заменена на ненулевую рамку внутри экрана; проверка foreground и отсутствие alerts сохранены. Attachments перенесены в XCTest tearDownWithError для сохранения при assertion failure; добавлен экспорт через xcresulttool. Исправлен оставшийся template CFBundleDisplayName. Новый результат успешен, приведён ниже.

## Итог iOS launch/UI smoke

[Run 38686080630](https://github.com/noname33-cmd/123/actions/runs/38686080630), commit `3d7b5af78bde6f5d48fb3700180f5fe38a8de5b1`: checks, android, ios — **success**. Frozen install, lint, typecheck, JS/native builds, 14 JS tests, PostGIS/Redis и Android device smoke прошли.

XCTest FoundationSmokeTests.testFoundationShellIsVisible реально выполнен на отдельном iPhone 16 Simulator / iOS 18.5 / Xcode 16.4: **1 test, 0 failures**, 25.008 секунды. Проверены три точных текста, ненулевые рамки внутри экрана, отсутствие alerts и runningForeground. Screenshot и hierarchy сохранены через tearDownWithError и экспортированы xcresulttool; screenshot визуально проверен — все сообщения видимы, обрезки нет. Проверка рамок не доказывает отсутствие произвольных перекрытий, поэтому screenshot проверен отдельно. В Debug виден стандартный баннер RN подключения Metro; CI не запускал Metro, использовался встроенный JS bundle.

ios-build-evidence artifact: 11950912304; ZIP SHA-256 bcdf0e33febd09a91570bc5d0e9aa75bf02b421800019457a43c5f1cbe80e8d9 совпал с GitHub digest. Podfile.lock SHA-256 после deployment install совпал с исходником: 2604b1449eb53cb7ee5f862b49ead415f3006b50a5fe1f050d527568633de3d3. Локальные evidence находятся в artifacts/ios-smoke-passed и исключены из Git. CI simulator удалён успешно.

Не проверены: physical iOS/ARM devices, другие iOS/API versions, release signing/builds, business E2E. Gradle dependency locking остаётся отдельным шагом. HERE/GPS SDK и product modules не добавлялись.

Файлы этой задачи (11):

- .github/workflows/ci.yml
- package.json
- scripts/verify-ios.cjs
- scripts/verify-ios.test.cjs
- apps/mobile/ios/TruckRouteSavingsUITests/FoundationSmokeTests.swift
- apps/mobile/ios/TruckRouteSavings.xcodeproj/project.pbxproj
- apps/mobile/ios/TruckRouteSavings.xcodeproj/xcshareddata/xcschemes/TruckRouteSavings.xcscheme
- apps/mobile/ios/TruckRouteSavings/Info.plist
- README.md
- apps/mobile/README.md
- docs/audit.md

Итоговое обновление только документации публикуется с [skip ci]; код соответствует проверенному commit выше.

## Продолжение: Android dependency locking

Добавлены project strict locks, отдельный root buildscript lock с presence guard, команда resolveDependencyLocks и отрицательная init fixture отсутствующего app state. Lockfiles library сохраняются вне node_modules. Массовое разрешение использует graph API с проверкой UnresolvedDependencyResult. Первые попытки выявили неоднозначность artifact variants и Kotlin metadata buckets; graph resolution устранил artifact selection, *DependenciesMetadata исключены из массового разрешения, оставаясь в STRICT. Генерация locks завершилась BUILD SUCCESSFUL в 18 секунд. Повторное graph resolution без --write-locks успешно; APK build затем завершился BUILD SUCCESSFUL: 88 tasks, 2m29s, без --write-locks. Negative app fixture отклонена strict mode (exit 1, does not have lock state); отдельная локальная проверка отсутствующего root buildscript lock отклонена presence guard (exit 1), файл восстановлен в finally. Все три lockfile после проверок побайтово совпали с исходниками. Первая версия init fixture затрагивала included build без :app; исправлена фильтрацией root project name. CI успешно выполнен, итог приведён ниже.

Root buildscript использует стандартную Gradle lock validation и явный presence guard. Project configurations используют STRICT. Settings/plugin-management contexts, included RN plugin builds и сторонние library buildscript classpaths не охвачены этими locks. Версии исходников таких npm packages закреплены pnpm-lock; checksums Maven artifacts и отдельный locking build contexts не добавлены. Новые native SDK/product modules не устанавливались.

Локальные Windows lockfiles (CRLF), SHA-256 до Git-нормализации: buildscript-gradle.lockfile ca44969860f7ce50d5faf452bcbf746bd13e0da252dfbedb00b88d13de0d5a06; app.lockfile eaf076345d360dd159a63f230a0a9ec623d78f14fb437dfd71244c4316067a68; react-native-safe-area-context.lockfile 25164c128d8f2598e4f76c630b57fc4a9da9688393f4dfe8953f92a88914c357.

Опубликованные lockfiles (Git/LF), SHA-256: buildscript-gradle.lockfile ee79dc5748a4dd93d54eac03919c5e83cfe5d5e66ebde2f14d626b52d1e7c63e; app.lockfile 65a031b1d1a086d57c97f41c4c224acd54da168bf1d154f8648565fa155ab683; react-native-safe-area-context.lockfile e829459c015bb9caca2227db24ad3116df6bf0988dca932019dd53d9027173de. Рабочие копии приведены к опубликованному LF, байты сверены с git show HEAD:<path>. Первоначальная проверка неизменности Windows build выполнялась с CRLF с обеих сторон; различие только в нормализации окончаний строк.

CI run 38691647263 на commit ac50fb210d1a5567ac2e4014c866baadf07e9eca: checks и android прошли. Android fresh Linux runner: resolveDependencyLocks + assembleDebug BUILD SUCCESSFUL в 3m3s; negative missing-state fixture прошла, git diff lockfiles пуст, API 35 x86_64 emulator UI smoke прошёл. iOS regression job также прошла: 1 XCTest, 0 failures (20.707 секунды).

## Итог Android dependency locking

[Run 38691647263](https://github.com/noname33-cmd/123/actions/runs/38691647263), commit `ac50fb210d1a5567ac2e4014c866baadf07e9eca`: **checks, android, ios success**.

В чистом CI прошли frozen install, lint, typecheck, JS/native builds, 14 JS unit/component/HTTP/script tests, PostGIS/Redis integration, Android graph resolution и APK build без --write-locks, negative missing-state test, git diff lockfiles, Android device smoke и 1 iOS XCTest (0 failures). Локально Windows build и обе negative scenarios (app state/root buildscript file) также прошли; изменяемый для root-guard test файл находился только в validation workspace и восстановлен в finally.

Evidence ZIP digests сверены: android-smoke-evidence artifact 11952611745 — 068d56637c4aa11f6db4ab7b0cf49547e8fa3590302e89f34aef6c04e2c8c885; ios-build-evidence artifact 11952532832 — 574453090a4be6b5f2035cd618e0bd516df825df6a955a40f5e59189bac57045. Android artifact содержит missing-lock.log; iOS log подтверждает Executed 1 test, 0 failures. Локальные evidence в artifacts/gradle-lock-ci-android и artifacts/gradle-lock-ci-ios исключены из Git.

Не выполнены в этой задаче: release binary/signing, physical devices, другие OS/ABI runtime configurations; отдельный locking settings/included/library buildscript contexts; Maven artifact checksum verification. Kotlin metadata buckets без Android variant остаются STRICT, но требуют отдельного целевого разрешения при будущем использовании. Новые product modules, HERE/GPS SDK, Prisma integration пока не добавлены. Следующий отдельный шаг — Prisma/PostgreSQL backend connection module и integration test.

Изменённые/добавленные файлы (10):

- apps/mobile/android/build.gradle
- apps/mobile/android/buildscript-gradle.lockfile
- apps/mobile/android/gradle/dependency-locking.gradle
- apps/mobile/android/gradle/dependency-locks/app.lockfile
- apps/mobile/android/gradle/dependency-locks/react-native-safe-area-context.lockfile
- scripts/gradle-missing-lock.init.gradle
- .github/workflows/ci.yml
- README.md
- apps/mobile/README.md
- docs/audit.md

Итоговая правка только документации публикуется с [skip ci]. Исходники соответствуют проверенному commit выше; git diff --check прошёл.

## Продолжение: Prisma/PostgreSQL connection foundation

Добавлен packages/database: DatabaseConnection port, PrismaDatabaseConnection adapter, CommonJS generated Prisma Client 7.10.0. Prisma CLI/Client/adapter-pg закреплены; Диапазон Node ограничен 22.x (>=22.12) и 24.x по требованиям Prisma 7; неподдерживаемый Node 23 исключён. Prisma latest указывал на 8 RC, поэтому выбрана проверенная stable 7.10.0. Схема без business models; generate/build не требуют URL. Generated source исключён из Git и включён в Turbo outputs. Отдельная зависимость build перед database typecheck предотвращает конкурентную генерацию. Dev-only react-dom 19.2.3 закрывает Prisma Studio peer и совпадает с текущим React.

Nest DatabaseModule создаёт один adapter через DI token, подключается и проверяет PostGIS на startup, закрывает pool на shutdown. DATABASE_URL обязателен, валидация требует PostgreSQL protocol/host/database/user/password. Нет fallback или runtime test mode. Ошибки конфигурации/startup не повторяют credentials. /health сохраняет смысл process liveness; постоянный DB readiness пока не реализован. Pool max 5, connection/statement timeout 5000 ms, idle timeout 10000 ms. SSL options передаются драйверу без принудительного rejectUnauthorized: false; фактическая SSL policy зависит от connection options и требует production-проверки.

Добавлен test:database: выделенный контейнер закреплённого PostGIS image, случайный пароль и loopback port, анонимный volume; finally удаляет только контейнер текущего запуска и его volume. Developer DATABASE_URL, Compose volumes и фиксированные host ports не используются. Реальные integration tests проверяют Nest startup, SELECT PostGIS_Lib_Version(), shutdown hook и неверный пароль с точной sanitized error. Дополнительный smoke запускает скомпилированный bootstrap с generated Prisma Client, выполняет HTTP /health и закрывает app; отдельный compiled main без DATABASE_URL завершается с кодом 1. CI checks включает эту команду.

Промежуточная публикация README была обрезана лимитом вывода инструмента передачи. Файл восстановлен отдельным commit 60b6570; после fetch локальные исходники сверены с опубликованными, git status пуст. Следующий commit 8895796 уточнил поддерживаемые Node major versions и актуализировал README. Итоговый CI проверяется именно для 8895796; дефект передачи не затрагивал код.

Промежуточные ошибки найдены и исправлены до публикации: TS weak-type несовместимость ProcessEnv; относительный ts-jest tsconfig при запуске из root. Оба реальных integration tests затем прошли, временные контейнеры удалены. Локально Windows/Node 24.19 прошли frozen install, lint, typecheck, build, unit/component (8 tests), HTTP (2), scripts (11), real database integration (2) и compiled smoke (успешный запуск + missing config). Итого 23 test assertions/cases в test runners плюс compiled smoke; не считать их business E2E. Некоторые неизменившиеся задачи использовали Turbo cache; чистый CI проверяется отдельно, результат ниже будет добавлен после выполнения.

Не добавлены/не проверены: business models/migrations, spatial ORM mapping, Redis/BullMQ backend adapter, production TLS/auth/pooling/load/recovery behaviour, readiness после разрыва соединения, physical devices/release signing, HERE/GPS. При принудительном завершении test harness finally может не выполниться; проверяйте адресно оставшиеся truck-db-integration-* контейнеры. Следующий отдельный шаг — согласование первого domain contract и migrations с явными единицами измерения и денежными типами.

Изменённые/добавленные файлы этой задачи (30):

- .github/workflows/ci.yml
- .gitignore
- README.md
- apps/api/README.md
- apps/api/jest.config.cjs
- apps/api/package.json
- apps/api/src/app.module.ts
- apps/api/src/database.module.ts
- apps/api/test/database.unit.spec.ts
- apps/api/test/database.integration.spec.ts
- apps/api/test/health.e2e.spec.ts
- packages/database/README.md
- packages/database/package.json
- packages/database/prisma.config.ts
- packages/database/prisma/schema.prisma
- packages/database/src/connection.ts
- packages/database/src/index.ts
- packages/database/src/prisma-database-connection.ts
- packages/database/test/config.unit.test.cjs
- packages/database/tsconfig.json
- scripts/verify-android.cjs
- scripts/verify-android.test.cjs
- scripts/verify-api-database.cjs
- scripts/verify-database.cjs
- scripts/verify-database.test.cjs
- package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml
- turbo.json
- docs/audit.md

### Результаты CI для database foundation

[Run 38701537980](https://github.com/noname33-cmd/123/actions/runs/38701537980), commit `8895796d1cf01423d254c6cba625f7bad42a2120`. Checks прошёл на чистом Linux/Node 22.22.0: frozen install, lint, typecheck, build, 23 JS/unit/component/HTTP/script/database tests, compiled API smoke (реальный DB + HTTP + shutdown; missing config exit 1), PostGIS/Redis checks и cleanup. iOS native build/deployment pod install и UI smoke прошли: 1 XCTest, 0 failures, 13.539 секунды, iPhone 16/iOS 18.5/Xcode 16.4. Evidence artifact 11956986160, ZIP SHA-256 8c9a077a81975169a21828cc5662d31fe154bc67c1731941729a89e6e1a7ad57 совпал с GitHub digest. Screenshot просмотрен: все три текста видимы без обрезки. Evidence не входит в Git.

Первый Android job этого run: APK build, strict-lock negative check и неизменность lockfiles прошли; UI smoke не увидел три текста за окно ожидания. Metro лог показывает позднее завершение cold bundle и сообщение об ошибке установки DevTools sandbox; причинная связь со сбоем UI не доказана. UI XML/screenshot при таком раннем failure существующий smoke script не сохраняет, поэтому причина не установлена. Failure evidence artifact 11956980739 сохранён локально, ZIP SHA-256 05df4580d8927042c70eb9536721bdfb93d1ecd667ae124a629fd14a00e8bcfd сверён с digest. Это не выдаётся за успешный первый прогон. Запущен повтор только failed Android job без изменений исходников и assertions.

Предыдущий полный run 38700779813 на commit 60b6570 прошёл checks/android/ios; он не заменяет проверку финального диапазона Node. Повтор Android job (attempt 2) также не увидел shell texts; это не считается устранённой случайной ошибкой.

Отдельно не выполнялись: проверка процесса через настоящий SIGTERM (проверен app.close и успешное завершение compiled smoke), отсутствие PostGIS как отдельный negative integration scenario, production TLS/load/recovery, physical devices/release signing и business E2E. После второго failure добавлены явная готовность Metro, предварительная сборка полного и lazy Android bundles перед emulator smoke и сохранение UI XML/screenshot/PID logs при неуспешной UI-проверке. URL options сверены с установленным React Native 0.84 DevServerHelper.kt. Assertions и число UI retries не ослаблены. Добавлен unit test: screenshot failure не должен терять UI XML/app logs или маскировать исходную UI assertion. Локально lint и 12 script tests прошли. Эти изменения ограничены CI-проверкой foundation; итог нового CI зафиксирован ниже. Следующий domain contract/migrations остаётся отдельной задачей.

### CI после подготовки Metro и сохранения failure evidence

[Run 38704005945](https://github.com/noname33-cmd/123/actions/runs/38704005945), commit `3e1f853ff921f8c340768ffc58533b7609f56766`: checks, android и ios success с первой попытки нового run.

Чистый Linux/Node 22.22.0 выполнил frozen install, lint, typecheck, build, 24 JS/unit/component/HTTP/script/database tests (8 unit/component + 2 HTTP + 12 scripts + 2 database), compiled API smoke и PostGIS/Redis checks. Database test использует отдельный одноразовый container и удаляет его volume. Локально Node 24.19.0 повторно выполнены lint и 12 script tests для изменённого harness; предыдущие backend build/typecheck/unit/HTTP/integration checks перечислены выше.

Android fresh runner: graph resolution и APK build прошли без --write-locks, negative missing-lock check и git diff lockfiles успешны. До emulator запуска Metro вернул packager-status:running, полный и lazy bundle запросы завершились успешно; затем API 35 x86_64 device smoke проверил shell. Assertions/retries не ослаблялись. Screenshot просмотрен, три текста видимы без обрезки. Artifact 11957029913, ZIP SHA-256 c4d2fd42cbc18445bcf2f1b12bc57c21e0c081cbcf4125870cad8f0bc976e308 совпал с GitHub digest. В Metro log успешного run также остаётся ошибка optional DevTools installer sandbox; она не помешала проверенному запуску, sandbox не отключался. Точная причина предыдущих UI failures не доказана, а успешный run после prewarm не гарантирует отсутствие любых будущих flakes.
Итог iOS: Simulator build и настоящий FoundationSmokeTests.testFoundationShellIsVisible прошли на iPhone 16/iOS 18.5/Xcode 16.4: 1 test, 0 failures, 24.790 секунды самого теста. Вся фаза подготовки/запуска тестов заняла дольше; она завершилась штатно, без отключения assertions. Artifact 11958486179, ZIP SHA-256 73af0fdf2bcd2dd19aeeccbcb34df1f2ec417749bd17389e59631929f4603e8e сверён с GitHub digest. Screenshot просмотрен: три текста видимы без обрезки; стандартный Debug Metro banner остаётся. CI simulator удалён успешно.

Итого: install/build/test/start подтверждены на указанных Node/OS и disposable DB; это не подтверждение production readiness или HERE/GPS integration. Невыполненные проверки и риски перечислены выше (TLS/load/recovery, настоящий SIGTERM, отдельный negative без PostGIS, physical/release/business E2E, optional DevTools installation, возможные будущие native flakes). Следующий отдельный шаг — согласовать первый domain contract, его единицы/денежные типы и затем migrations. HERE SDK требует отдельной проверки лицензии и совместимости до установки.

Итоговая публикация изменяет только README и этот audit с [skip ci]; исполняемый код и workflow совпадают с проверенным commit 3e1f853. Полный список 30 файлов этой задачи приведён выше. Локальный git diff --check прошёл; generated Client, binaries, screenshots, tools и credentials в Git не включены.

## Продолжение: локальный start/status/stop и окно Android (Windows)

По выбранной пользователем задаче добавлены команды pnpm local:up/local:status/local:down и прямой entrypoint node scripts/local.cjs up|status|down. Source changes (5 файлов): package.json, scripts/local.cjs, scripts/local.test.cjs, README.md, docs/audit.md. Machine-specific config, state, logs и UI evidence находятся только в ignored artifacts/local-run; .env остаётся локальным и не выводится в лог.

Up проверяет занятость API/Metro/emulator ports без остановки посторонних процессов, запускает фиксированный Compose project truck-route-savings, проверяет PostgreSQL/PostGIS/Redis, генерирует Prisma Client и компилирует database/API/navigation установленными Node tools. Затем скрыто запускает API и Metro, прогревает bundles, открывает видимое окно заданного Android AVD, устанавливает настроенный debug APK и проверяет shell текущим Android smoke. Native SDK installation/build в эту команду не включены. Конфигурация использует абсолютные локальные SDK/AVD/APK paths; пример в README не содержит настоящих machine paths или credentials.

State привязан к checkout и сохраняет PID/executable/command line/UTC creation time. Down перепроверяет идентичность непосредственно перед Stop-Process; повторно использованный PID не останавливается. Для emulator сначала проверяются собственные launcher/qemu snapshots и имя AVD, затем используется adb emu kill, с fallback только на проверенные собственные процессы. Остановка ждёт освобождения управляемых портов. Compose stop не удаляет volumes и закреплён explicit project name; окружение чужого COMPOSE_PROJECT_NAME не подменяет project. Node stop здесь предназначен для local dev, graceful production shutdown не заявляется.

При missing .env и уже существующем PostgreSQL volume команда требует восстановить исходный пароль. При отсутствии обоих .env создаётся со случайным local-only password; .env и state не коммитятся. Local DATABASE_URL ограничен соответствующей loopback Compose DB без query/hash, password сверяется с POSTGRES_PASSWORD; в API передаётся URL, в Metro/emulator DB credentials не передаются. При ошибке запуска закрываются новые собственные процессы и останавливаются только services, которые до up не работали. Atomic state write и lock исключают конкурентную запись; read-only status доступен во время startup. После принудительного завершения может понадобиться проверка stale lock вручную.

Фактически проверено на Windows / Node 24.19.0 / pnpm 10.28.2:

- lint и 18 script tests (6 новых local tests): reused PID/изменённая identity, foreign AVD, занятый порт с сохранением listener, отказ readiness, запрет remote/mismatched DB и query overrides, Windows CRCRLF ADB response.
- Negative real startup поверх ранее вручную запущенного API: отказ Port 3000 is occupied, исходный /health продолжил отвечать. Foreign processes не присваиваются команде.
- Полный up: реальная PostGIS/Redis verification, generation/build, API health, Metro full/lazy HTTP bundles, Android API 35 x86_64 boot, APK install и UI smoke. Окно qemu подтверждено через MainWindowTitle Android Emulator - TruckFoundationApi35:5554 и ненулевой handle.
- Повторный up работающего managed стенда показал status без новых процессов; status во время запуска работал.
- Down: API/Metro/qemu/launcher завершились, оба ранее записанных Metro worker PID исчезли, порты 3000/8081/5554/5555 освободились, контейнеры проекта остановились, volumes остались. Повторный down прошёл.
- Следующий up и Android smoke прошли. PostgreSQL system_identifier до/после down/up совпал; оба volume names совпали. Это проверка сохранения кластера/volumes, не отдельный бизнес-тест durability.
- Status при COMPOSE_PROJECT_NAME=not-this-project показал правильные project containers; они healthy, API/Metro ready, Android booted. Стенд оставлен работающим с видимым окном.

Промежуточные проблемы исправлены: глобальный pnpm shim пытался запускать неподходящий install при nested Turbo build — helper теперь вызывает установленные Prisma/TypeScript напрямую, без installation; Windows ADB вернул CRCRLF в имени AVD — разбор исправлен и покрыт regression test. При AVD mismatch rollback завершил новые процессы, сохранив ранее запущенную инфраструктуру.

В этой задаче не выполнялись: новая установка dependencies (они не изменены), native APK rebuild, macOS/Linux local:* automation, Windows GUI CI, production/graceful stop и проверка принудительного завершения CLI/всех crash windows, отдельный fresh-volume сценарий автосоздания .env и rollback вновь запущенных Docker services, запуск под другими Windows accounts. GitHub CI/публикация для этих локальных изменений не запускались. Предыдущие CI results выше относятся к прежнему проверенному commit. Настроенный debug APK существовал ранее, текущий JS подаётся Metro из этого checkout; при native changes APK нужно пересобрать отдельно. CIM permissions и оставшийся stale lock после force-close могут требовать локального устранения; команды не меняют системную execution policy, UAC или SDK settings.

Следующий шаг — ручная проверка shell в открытом окне; продуктовые модули, routing/GPS, auth и domain migrations в эту задачу не включены.

## Продолжение: первый truck profile contract

Перед работой проверены существующие docs, package conventions и локальный стенд. API/Metro ready, PostgreSQL/PostGIS и Redis healthy, Android booted. Повторный Android smoke на текущем локальном shell прошёл; screenshot просмотрен — три текста видимы без обрезки. Evidence находится в ignored artifacts/local-review/android. В логе нет markers, отклоняемых smoke script; это не доказательство отсутствия любых runtime ошибок.

Добавлен чистый packages/truck-profile без dependencies: branded decimal SI types, runtime parsers и TruckProfile schemaVersion 1. На запрос типа транспорта ответа в ходе работы не поступило; минимальное рабочее допущение явно обозначено — тягач с одним полуприцепом. Другие типы отклоняются до отдельного решения. Новые операции HERE/GPS, routing, API endpoints и DB models/migrations не добавлены; изменения предыдущего local:* этапа сохранены.

Габариты определены как текущие внешние габариты всего состава с грузом; currentGrossMassKilograms — текущая полная масса состава с грузом/топливом/людьми; totalAxleCount — все физически установленные оси, включая подъёмные, не только оси под нагрузкой. Эти внутренние определения не являются mapping в поля SDK. До mapping требуется сверка официальных определений провайдера, лицензии и native compatibility.

Meters/Kilograms несовместимы в TypeScript; runtime принимает только положительные decimal strings, нормализует избыточные нули без Number/float/округления и сохраняет все значащие цифры. Счётчик осей — положительное safe integer. Нет придуманных физических/дорожных maxima или типовых defaults. Unknown/missing/null/числовые measurements/scientific notation/неизвестные поля и виды транспорта отклоняются. Unknown hazardousCargo не игнорируется. Успешная синтаксическая валидация не доказывает road legality, фактическую точность водительских данных или navigation readiness. Результат — frozen copy без aliasing/mutation input; errors содержат field/code без исходных значений.

Фактически выполнены локально Windows / Node 24.19.0 / pnpm 10.28.2:

- Новый package build, typecheck (включая compile-time запреты Meters/Kilograms/bare string), lint и 6 runtime tests — success.
- pnpm install --frozen-lockfile — success. В pnpm-lock добавлен только packages/truck-profile: {}; новых внешних dependency resolutions нет.
- Root pnpm lint, typecheck, build, test — success. Build включает Android/iOS JS bundles, не native binary build. Unit/component tests: 14 (6 profile + 1 navigation + 3 database config + 3 API + 1 mobile). Часть неизменившихся build/lint tasks использовала Turbo cache; новый package сгенерирован/проверен локально.
- Локальный API/Metro/Android status после install/build — ready/booted; project Docker containers healthy. Стенд оставлен запущенным с прежним shell; профиль к UI пока не подключён.

Не выполнялись в этой задаче: новое HTTP/database integration тестирование (backend не изменён), повторный native APK/iOS binary build или iOS runtime, GitHub CI/публикация, UI формы профиля, хранение/ownership/auth, migrations, US-unit conversions, выбор и SDK mapping иных vehicle types/осей, проверка реальных truck limits/permits/road legality. Нынешний контракт намеренно не считается route-ready. Тип состава и семантику полей нужно подтвердить до UI/storage integration; при иной потребности контракт будет расширен отдельно.

Изменённые/добавленные файлы текущего этапа (13), отдельно от сохранённых local:* изменений:

- packages/truck-profile/package.json
- packages/truck-profile/tsconfig.json
- packages/truck-profile/tsconfig.type-tests.json
- packages/truck-profile/src/index.ts
- packages/truck-profile/src/measurements.ts
- packages/truck-profile/src/profile.ts
- packages/truck-profile/test/measurements.test.cjs
- packages/truck-profile/test/measurements.type-test.ts
- packages/truck-profile/test/profile.test.cjs
- packages/truck-profile/README.md
- pnpm-lock.yaml
- README.md
- docs/audit.md

Следующий отдельный шаг — форма ввода профиля на mobile с явными единицами. Перевод из US customary units требует отдельной точной реализации и проверки; хранение и авторизация не должны добавляться неявно вместе с формой. Реальные routing/GPS остаются вне этого этапа.

## Уточнение: оба типа транспорта

Пользователь подтвердил оба типа. Это заменяет первоначальное допущение выше: VehicleType теперь допускает rigid-truck (одиночный грузовик без прицепа) и tractor-semitrailer (тягач с одним полуприцепом). Парсер сохраняет выбранный тип. Общие габариты, текущая полная масса и число осей относятся ко всему автомобилю либо составу, включая груз; отдельные компоненты не моделируются.

Изменены packages/truck-profile/src/profile.ts, src/index.ts, test/profile.test.cjs, добавлен test/vehicle-type.type-test.ts; обновлены packages/truck-profile/README.md, корневой README.md и этот docs/audit.md. Предыдущие локальные изменения сохранены.

Фактически выполнены: package build, typecheck с compile-time проверками обоих допустимых и неизвестных типов, lint и 9 runtime tests — все успешно. Проверены сохранение типа и точности, JSON round-trip, неизменность input и обязательные поля обоих типов; неизвестные типы, включая car, отклоняются. git diff --check выполнен отдельно.

В этом уточнении не запускались повторно root pipeline, HTTP/DB integration, native Android/iOS builds, emulator smoke или GitHub CI; зависимости, backend и mobile не изменены. UI, хранение, SDK mapping и реальные ограничения маршрутов не реализованы и не проверялись. Корректный формат профиля не доказывает дорожную допустимость. Следующий отдельный шаг — mobile форма выбора типа и ввода профиля с явными единицами.

## Продолжение: mobile форма и логотип v1

Добавлена форма профиля для обоих подтверждённых типов. Нет предварительно выбранного типа или подставленных размеров. Все поля обязательны: имя, общие габариты в m, текущая полная масса в kg и все физические оси. Decimal measurements передаются в общий parser строками без float-конвертации; оси принимают только целую десятичную запись и проверяются как positive safe integer. Формат успешно проверенного профиля сбрасывается при редактировании/смене типа. Данные только в памяти, не сохраняются. Routing, GPS, auth и backend не расширялись.

Логотип создан встроенным image_gen: грузовик, дорога, зелёная стрелка. PNG скопирован в assets/brand, визуально просмотрен. Prompt и ограничения сохранены в assets/brand/README.md. Это концепт; native launcher icons не заменены, читаемость во всех размерах и товарные знаки не проверялись.

Изменены/добавлены 11 файлов этого этапа:

- apps/mobile/App.tsx
- apps/mobile/package.json
- apps/mobile/src/TruckProfileForm.tsx
- apps/mobile/src/README.md
- apps/mobile/__tests__/TruckProfileForm.test.tsx
- pnpm-lock.yaml
- assets/brand/truck-route-savings-logo-v1.png
- assets/brand/README.md
- packages/truck-profile/README.md
- README.md
- docs/audit.md

Выполнены локально: mobile typecheck и lint, 3 component tests в 2 suites (shell и оба типа формы), Android/iOS production JS bundles, git diff --check. Typecheck сначала обнаружил potentially undefined индексы в новых тестах; исправлено и повторно пройдено. Offline install с обновлением lockfile прошёл; повторный frozen install упал в локальном type-is temporary directory. Force reinstall также не помог. Каталог node_modules/type-is перемещён с проверкой путей в ignored artifacts/dependency-repair, затем две последовательные установки --frozen-lockfile --offline прошли. Lockfile добавляет workspace связь mobile → truck-profile; новых внешних пакетов в lockfile нет. Component tests повторно пройдены после восстановления.

Android shell smoke пройден на emulator-5554 с существующим debug APK и текущим JS из Metro. Screenshot начального экрана просмотрен: форма и оба выбора видны. ADB swipe и второй screenshot подтверждают доступность нижнего поля и Validate profile; нажатие пустой формы показало Choose a vehicle type в UI hierarchy. Evidence — ignored artifacts/profile-form/android. Это ограниченная device-проверка, не полный E2E успешного заполнения/клавиатуры/доступности. API/Metro ready, PostgreSQL и Redis healthy, видимый эмулятор оставлен запущенным.

Не выполнены: повторный root pipeline, fresh-machine install без pnpm cache, native Android/iOS rebuild, iOS runtime, полное device E2E, keyboard/screen-reader/dark-mode/multiple-screen coverage, новые HTTP/DB integration, GitHub CI или публикация. Backend и native dependencies не менялись. Риски: SI-only ввод пока неудобен для американских водителей, данные теряются при перезапуске, валидация не проверяет физическую правдоподобность или дорожную допустимость. Следующий отдельный шаг — точные конвертации ft/in/lb с тестами до использования US-unit UI; хранение/ownership требует отдельной задачи.

## Продолжение: точные US → SI conversions

Добавлены feetToMeters, inchesToMeters и poundsToKilograms с положительным decimal-string вводом и branded SI результатом. BigInt умножает целочисленный coefficient, decimal scale сохраняется строками: без Number/parseFloat, округления и потери значащих цифр. Zero/negative/unknown/number/scientific/comma/fractions/mixed-unit inputs отклоняются. Коэффициенты international foot/inch и avoirdupois pound сверены с NIST Handbook 44 (2023), Appendix C, C-10/C-11/C-20/C-22; точная ссылка в README пакета. Survey foot, pound-force и troy pound не используются.

Mobile форма предлагает m/kg, ft/lb и in/lb. Каждый режим имеет отдельный черновик всех полей в памяти; выбранный тип транспорта общий. Переключение восстанавливает соответствующий черновик, сбрасывает validation result и не переинтерпретирует число в других единицах. По умолчанию m/kg. Поддерживаются decimal feet или total inches; составной ft+in пока нет. Перед общим parser US значения конвертируются; при conversion error ввод не передаётся как SI. Успешная проверка показывает точные нормализованные SI значения. Новых зависимостей, SDK, endpoints, DB моделей или storage не добавлено.

Файлы этого этапа (10):

- packages/truck-profile/src/conversions.ts
- packages/truck-profile/src/index.ts
- packages/truck-profile/test/conversions.test.cjs
- packages/truck-profile/test/conversions.type-test.ts
- apps/mobile/src/TruckProfileForm.tsx
- apps/mobile/__tests__/TruckProfileForm.test.tsx
- packages/truck-profile/README.md
- apps/mobile/src/README.md
- README.md
- docs/audit.md

Фактически выполнены локально: package build/typecheck/lint и 12 runtime tests, mobile typecheck/lint и 7 component tests в 2 suites, Android/iOS production JS bundles, git diff --check — success. Type tests подтверждают выходные Meters/Kilograms и запрет смешивания. Runtime cases включают exact definitions, значения за пределами Number.MAX_SAFE_INTEGER, малые дроби, эквивалентность ft/in и отклонение неоднозначных форматов. Component tests покрывают оба типа × оба US режима, ожидаемые SI значения, восстановление черновика без переинтерпретации и ошибки mixed input/comma.

Android shell smoke пройден на emulator-5554 с прежним debug APK и текущим Metro JS. Отдельный ADB сценарий заполнил rigid truck в ft/lb: синтетические 13.5/8.5/60 ft, 80000 lb, 5 осей. Проверены точные 4.1148/2.5908/18.288 m и 36287.3896 kg в UI hierarchy; screenshot просмотрен, результат виден. Это подтверждает выполнение новой арифметики в текущем Android runtime. Evidence и локальный сценарий — ignored artifacts/us-units/android. Первая попытка сценария началась до завершения запуска Activity и получила null UI root; после завершённого shell smoke повторный сценарий прошёл. Стенд оставлен работающим: API/Metro ready, PostgreSQL/Redis healthy, emulator booted.

Не выполнялись: новая установка (dependencies/lockfile не менялись), root pipeline, native binary builds, iOS runtime, device проверка in/lb и semitrailer, screen-reader/dark-mode/другие устройства, полный device regression, новые HTTP/DB integration, GitHub CI/публикация. Риски: нет составного ft+in, обратных конвертаций или persistent drafts; все значения заявлены пользователем, формат и единицы не доказывают road legality. Следующий отдельный шаг — составной ввод feet + inches с точными конвертациями и проверками; storage/ownership остаются отдельной задачей.

## Продолжение: отдельные поля feet + inches

Добавлен feetAndInchesToMeters и тип CompoundLengthResult. Оба входа обязательны: строка целых неотрицательных футов и строка десятичных дюймов [0,12). Пустой компонент не заменяется нулём; пользователь явно вводит 0. Общая длина положительна. Двенадцать дюймов отклоняются без скрытого переноса; граница относится к форме записи единиц, не к ограничениям грузовых маршрутов. BigInt/decimal scale точно складывают компоненты и умножают на существующий коэффициент 0.0254; float и округления нет. Источник определения дюйма прежний, указан в README пакета.

В mobile добавлен четвёртый режим ft+in/lb с отдельными полями футов/дюймов для трёх габаритов. Футы используют number-pad, дюймы decimal-pad. Масса остаётся в lb. Черновик нового режима, включая дюймы, восстанавливается при переключении; ошибки конвертации не переинтерпретируются как SI. Изменение любого компонента сбрасывает успешную проверку. Хранение, API, auth, routing/GPS, зависимости и native SDK не менялись.

Файлы этого этапа (10): packages/truck-profile/src/conversions.ts, src/index.ts, test/conversions.test.cjs, test/conversions.type-test.ts; apps/mobile/src/TruckProfileForm.tsx, __tests__/TruckProfileForm.test.tsx; packages/truck-profile/README.md, apps/mobile/src/README.md, README.md, docs/audit.md. Ранее незакоммиченные изменения сохранены.

Выполнены: package build/typecheck/lint и 14 runtime tests; mobile typecheck/lint и 9 component tests в 2 suites; Android/iOS production JS bundles; git diff --check — success. Покрыты нулевые компоненты при положительном итоге, оба нуля, отсутствующий/числовой/неоднозначный ввод, дробные футы в составной записи, 12 и более дюймов, малые дроби, большие значения без float и Meters type safety. Component tests проверяют оба типа транспорта, восстановление дюймов, точный результат и сброс успеха после редактирования.

Android shell smoke пройден. Отдельный ADB сценарий заполнил rigid truck в ft+in/lb: 13 ft + 6 in, 8 ft + 6 in, 60 ft + 0 in, 80000 lb, 5 осей (синтетический ввод, не defaults/дорожные пределы). В UI hierarchy подтверждены точные 4.1148/2.5908/18.288 m и 36287.3896 kg; screenshot просмотрен, результат виден. Evidence и локальный сценарий — ignored artifacts/compound-units/android. Использован существующий debug APK с текущим JS из Metro; native binary заново не собирался. API/Metro ready, PostgreSQL/Redis healthy, видимый эмулятор оставлен запущенным.

Не выполнялись: повторная установка (dependencies/lockfile неизменны), root pipeline, native Android/iOS builds, iOS runtime, device semitrailer/negative regression, screen-reader/dark-mode/другие экраны, новые HTTP/DB integration, GitHub CI/публикация. Риски: нет persistent drafts или обратной конвертации; slash fractions и свободная текстовая запись с единицами не поддерживаются; проверяется формат, не физическая правдоподобность/road legality. Следующий отдельный шаг — локальное сохранение проверенного профиля с версией данных, восстановлением и явным удалением; backend ownership/auth остаются отдельной задачей.

## Продолжение: локальный SI snapshot через storage interface/adapter

Добавлены TruckProfileStore, KeyValueStorage и JsonTruckProfileStore; внешняя библиотека изолирована в AsyncStorageProfileStore. Вручную сохраняется один валидированный профиль обоих типов в envelope storageVersion 1 + profile schemaVersion 1, с точными SI decimal strings. Save повторно валидирует ввод и явно заменяет снимок, Restore проверяет JSON/envelope/profile и возвращает нормализованный m/kg draft и vehicleType, Delete удаляет только свой ключ, оставляя текущую форму. Нет autosave, auto-restore, автоматического удаления испорченных данных, backend/auth/sync или сохранения незавершённых US drafts. Неизвестная версия envelope даёт unsupported-version; плохой JSON/schema/unknown fields — invalid-data; I/O errors и отсутствие native module — unavailable, без исходных значений/exception detail в UI. Никакого in-memory fallback, выдаваемого за сохранение, нет.

UI Save недоступен до проверки; редактирование снимает validation. Pending guard сериализует кнопки, поля/режим/тип/валидация заблокированы на время I/O; запоздалый ответ после unmount не изменяет UI. Restore заменяет только m/kg draft; другие unit drafts сохраняются в памяти. Успех операции появляется после await. Локальное storage незашифрованное; секреты/токены/GPS в него не помещаются, ownership не имитируется.

До установки проверены официальные docs AsyncStorage 3.1, npm metadata и исходники API/podspec/Gradle: RN iOS/Android >=0.76, Kotlin >=2.1.0, min SDK 24, iOS >=13, MIT. Проект RN 0.84.0 / Kotlin 2.1.20 / SDK 24 соответствует заявленным минимумам. Закреплена версия 3.1.1; createAsyncStorage/getItem/setItem/removeItem сверены с установленными types и документацией (ссылка в storage README). Добавлены npm package и idb dependency в pnpm-lock.

Файлы текущего этапа (22), отдельно от сохранённых предыдущих изменений:

- apps/mobile/src/storage/TruckProfileStore.ts
- apps/mobile/src/storage/AsyncStorageProfileStore.ts
- apps/mobile/src/storage/README.md
- apps/mobile/src/ProfilePersistence.tsx
- apps/mobile/src/TruckProfileForm.tsx
- apps/mobile/App.tsx
- apps/mobile/__tests__/TruckProfileStore.test.ts
- apps/mobile/__tests__/AsyncStorageProfileStore.test.ts
- apps/mobile/__tests__/ProfilePersistence.test.tsx
- apps/mobile/__tests__/TruckProfileForm.test.tsx
- apps/mobile/package.json
- pnpm-lock.yaml
- apps/mobile/android/gradle/dependency-locks/app.lockfile
- apps/mobile/android/gradle/dependency-locks/react-native-async-storage_async-storage.lockfile
- apps/mobile/ios/Podfile.lock
- scripts/local.cjs
- .github/workflows/ci.yml
- README.md
- apps/mobile/README.md
- apps/mobile/src/README.md
- packages/truck-profile/README.md
- docs/audit.md

local:up теперь компилирует truck-profile перед Metro. Android/iOS CI jobs также собирают navigation и truck-profile; двухфильтровая pnpm build команда проверена локально. CI deployment lock enforcement/assertions не ослаблены. Реальный полный local:down/up cycle этого изменения не повторялся; status проверен, 18 script tests прошли (включая 6 local helper tests).

Фактически выполнены:

- Install с новым native package; первый pnpm запуск упал в express/node_modules/type-is temporary directory. Два конкретных локальных type-is каталога перемещены в ignored artifacts/storage-review после проверки абсолютных путей, затем frozen install прошёл; последующий --frozen-lockfile --offline также success. В ASCII native build checkout сначала обнаружен устаревший apps/api/package.json относительно lockfile; package manifest синхронизирован, frozen install success. Секреты/.env в build checkout не копировались.
- Mobile typecheck/lint и 18 tests в 5 suites — success. Покрыты оба типа профиля, точный round-trip через новый store instance, запрет invalid writes, сохранение повреждённых/неизвестных данных, IO failures, один storage key, восстановление формы, Save после validation, serial requests и UI lock. Native adapter unit test использует mock; сам по себе не подтверждает дисковую запись. Первоначальный dynamic import не работал в Jest harness: заменён на lazy require без eager native dependency; последующие проверки прошли. Небольшие ошибки типов test mocks исправлены до финального прогона.
- Android/iOS production JS bundles — success; navigation/truck-profile build — success; git diff --check — success.
- Android resolveDependencyLocks --write-locks — success, 5m32s. Затем resolveDependencyLocks + assembleDebug x86_64 БЕЗ --write-locks — success, 3m50s, 123 tasks (89 executed/34 up-to-date). App lock обновлён, добавлен library lock; buildscript/safe-area locks семантически не изменены. Копии lockfiles после обычной native сборки совпали с workspace. В логе остаются предупреждения SDK XML schema и Gradle 10 deprecations; текущую сборку Gradle 9 они не остановили. Missing-lock negative check в этом этапе повторно не запускался.
- Новый APK установлен поверх прежнего, Android shell smoke прошёл на emulator-5554/API35 x86_64. ADB сценарий заполнил синтетический rigid truck в ft+in/lb, валидировал, сохранил, выполнил force-stop/start, восстановил точные SI значения, удалил запись, снова force-stop/start и проверил No saved profile on this device. Сохранение/восстановление SI и отсутствие после удаления подтверждены UI hierarchy; выбранный vehicleType отдельно проверен component/store tests, не device assertion; restored.png/deleted.png просмотрены. Evidence и локальный сценарий — ignored artifacts/profile-storage/android. Тестовая запись удалена; текущий экран показывает отсутствие снимка. Это проверка restart процесса, не reboot/uninstall/reinstall.
- API/Metro ready, PostgreSQL/Redis healthy, emulator booted; стенд оставлен запущенным, local config указывает на пересобранный APK.

iOS Podfile.lock подготовлен как metadata update внешнего pod AsyncStorage 3.1.1, а НЕ результат выполненного pod install. Podspec вычислен CocoaPods 1.15.2 в Ruby container с установленными RN 0.84 helpers и существующим new-architecture/prebuilt dependency context. Нормализованная JSON checksum контрольного safe-area pod совпала с прежним lock (9e2124f6042abcc1d033faf91a56fe05a9c6e0c4); AsyncStorage metadata checksum b1af8208aba0429d02dd74d24f1d07f14df49d1c. Все новые pod dependencies уже присутствуют в прежнем resolved graph; добавлены только external pod/version/path/checksum. Это metadata sanity check, не Xcode/CocoaPods integration validation. На macOS обязательны bundle exec pod install --deployment, build и runtime test; iOS storage integration до этого НЕ подтверждена.

Не выполнялись: полный root pipeline и новые HTTP/DB integration (backend не менялся), macOS pod install/native iOS build/runtime, Android arm64/physical devices/release, reboot/uninstall/backup/restore, полный accessibility/dark-mode/экранный regression, device semitrailer/отказы диска/повреждение данных, повторный missing-lock negative check, GitHub CI/публикация. Риски: iOS native metadata ещё требует проверки на macOS; сохранён один незашифрованный локальный снимок, без secure erase/backup гарантий, миграций или аккаунтов. Следующий шаг — macOS iOS deployment install/build/runtime validation новой native зависимости; backend ownership/auth остаются отдельной задачей.

## Продолжение: iOS native validation

Перед изменениями сверены Git status, main HEAD/remote (90c3250), текущие UI labels, XCTest target/scheme, iOS runner и Podfile.lock. По ранее данному разрешению пользователя подготовлена публикация накопленных локальных исходников в noname33-cmd/123 и общий CI; секреты/.env, APK, SDK/tools, node_modules и artifacts исключены.

Изменены apps/mobile/ios/TruckRouteSavingsUITests/FoundationSmokeTests.swift, apps/mobile/App.tsx, apps/mobile/README.md, docs/audit.md. В существующий тестовый класс добавлен настоящий UI сценарий save/restart/restore/delete/restart/empty и screenshot восстановленного профиля. Перед записью проверяется отсутствие чужого snapshot; существующая запись не перезаписывается. Проверяются точные SI строки. Клавиатура скрывается при прокрутке (on-drag), тест прокручивает форму через координаты выше numeric keyboard. Shell assertions, deployment lock enforcement и выбор отдельного Simulator сохранены. На Windows Swift/Xcode тест не выполнялся; результаты CI фиксируются далее после выполнения.

Локально root lint/typecheck/test прошли (часть неизменённых задач использовала Turbo cache). Проверены 40 staging paths: исключены .env/APK/keystore/node_modules/artifacts, известных secret patterns не найдено. Прямой git push не имел сохранённых credentials; публикация выполнена подключённым GitHub connector без извлечения токенов. Для каждого blob проверен Git SHA, затем всё дерево: cabf0b598577b2ac014621a0a51c98c3c4c67cf7 совпало с локальным. Remote commit 45e03cc71de40ee790ffa2004599e9d632cf4e50; локальный предварительный commit сохранён отдельной backup branch, main синхронизирован только после проверки идентичного дерева.

Первый CI run 38759618833: checks и Android успешны; iOS остановлен на pod install --deployment. Точная причина — EXTERNAL SOURCES AsyncStorage имел ключ String ":path" вместо Symbol :path. Это ошибка подготовленного metadata lock, не отсутствие версии/checksum. Исправлен apps/mobile/ios/Podfile.lock, тип ключа проверен CocoaPods 1.15.2. Commit 62663122a54aaf2c4cac64ea376b3e8e9b669983, run 38760066552. Deployment enforcement не отключался. В этом run checks и deployment install уже прошли; native iOS build также прошёл, UI tests на момент записи ещё выполнялись.

Android в run 38760066552: APK/graphs/negative missing-lock check/неизменность locks прошли, emulator smoke failed. Artifact 11984944590 скачан, ZIP SHA-256 aa91c4da53d86aeb07101215fce4bbe5f01c1e30fba7564aa0835da50cbe1ceb совпал с GitHub digest, извлечён с проверкой путей в ignored artifacts/ci-6266312/android. Screenshot просмотрен: поверх видимого приложения системный ANR dialog "Quickstep isn't responding"; UI hierarchy содержит только диалог и Close app/Wait. Это непосредственно объясняет недоступность shell labels, но причина зависания launcher не установлена. App log не содержит проверяемых fatal/JS exception markers. Optional DevTools sandbox error в Metro log не отключался и не объявлен причиной этого сбоя. План — повтор только Android job на свежем runner без изменений/assertion обходов после завершения текущего workflow; GitHub отклонил ранний rerun, пока iOS job ещё running. Результаты повторов и iOS tests фиксируются далее, failure не считается pass.

## Продолжение 2026-10-17: разбор native CI failures

Проверен iOS artifact 11985633986: ZIP SHA-256 b02609b8e005a58dae5c7aa1b4a37f75d7b7a3ce1a1034c280958d6416f90806 совпал с GitHub digest. Deployment install и native build прошли; shell XCTest прошёл, persistence XCTest упал на точном SI summary после restore. Hierarchy показывает height 448, width 2908, length 18, mass 37.3896 вместо заданного fixture. Сохранение/restore состоялись, но исходный быстрый синтетический ввод потерял символы. Это не подтверждает корректность полного storage сценария и не исключает проблему быстрого пользовательского ввода в controlled inputs. XCTest изменён: посимвольный ввод с ожиданием наблюдаемого value после каждого символа и отдельной проверкой полного fixture перед Validate/Save. Assertions точных SI значений не ослаблены. Swift/XCTest локально на Windows не выполнялись; нужен новый macOS CI.

Повтор Android также failed: artifact 11986852519, SHA-256 bf177eb732e3b25f04f61f5cbdd54c7a5b1f3117e646776a45ff5e0af6aa5e3e проверен, ui.xml снова содержит системный Quickstep ANR dialog. В .github/workflows/ci.yml RAM эмулятора увеличена с 2048M до 4096M; это проверяемая гипотеза о ресурсах, не установленная причина ANR. API 35/x86_64, shell assertions, dependency locks и отсутствие автоматического закрытия ANR сохранены. Memory option сверена с https://developer.android.com/studio/run/emulator-commandline . Затронуты только workflow, FoundationSmokeTests.swift и этот audit. Новый CI должен подтвердить оба native сценария; до результата failures остаются failures.

Commit 935ce045b80ed4c9621e2360955f588f2719ee0c опубликован с проверкой SHA каждого blob и полного дерева ef48815f13eb717f65ccd41a294f72cc99b69e50. Run 39023269817: checks и Android завершились success; iOS на момент записи ещё выполняет XCTest. Локальные lint (5 packages, 4 cache hits), test:scripts (18/18) и git diff --check прошли.

Локальный стенд после перерыва был остановлен. Первый local:up поднял контейнеры/API/Metro, но Android UI smoke failed из-за системного диалога System UI isn't responding (screenshot визуально проверен). Выполнен local:down с проверкой ownership и сохранением volumes; только в ignored config.ini проектного AVD hw.ramSize увеличен 2G -> 4G, исходный config сохранён в ignored artifacts/local-run/avd-before-memory.ini. Повтор local:up завершился exit 0: реальные PostGIS geography/TCP и Redis PING/write/read checks, build, Metro bundles и Android shell smoke прошли; окно эмулятора открыто. Это ограниченная проверка запуска, полный Android storage сценарий в этой итерации повторно не выполнялся. Системный ANR не закрывался автоматически ради pass, assertions не изменялись. Причинная связь с RAM не доказана одним успешным повтором.

Итог run https://github.com/noname33-cmd/123/actions/runs/39023269817 на code commit 935ce045b80ed4c9621e2360955f588f2719ee0c: checks, android, ios — success. Проверены frozen install, lint/typecheck/build, 39 unit/component tests (profile 14, mobile 18, database 3, API 3, navigation 1), 18 script tests, 2 HTTP E2E, 2 настоящих PostGIS integration tests, PostGIS/Redis probes. Android APK x86_64/strict graphs/negative missing-lock check/lock unchanged/device UI smoke прошли. iOS deployment install/native build и 2 XCTest прошли: shell 10.506s, persistence 149.216s, всего 159.722s, 0 failures. Сценарий persistence дошёл до delete/restart/empty; точные SI строки проверены после restore.

iOS evidence artifact 12097771238 (3593082 bytes) скачан, SHA-256 20b388258d63e15406f2189369555fa4e2607428c2bd8452273b288255ece62a совпал. Логи/manifest/png извлечены с проверкой путей. Screenshot profile-restored визуально проверен: ширина 2.5908, длина 18.288, масса 36287.3896, axes 5 и точный SI summary с высотой 4.1148. Debug Metro banner виден, bundled JS работает без Metro на CI. Native artifacts и локальные конфиги не публикуются. apps/mobile/README.md и apps/mobile/src/storage/README.md обновлены фактическими результатами; итоговая публикация только документации с [skip ci] не заменяет tested code commit выше.

Не выполнены в этой итерации: iOS physical devices/другие версии/release signing; Android arm64/physical/release и повтор полного storage E2E; reboot/uninstall/backup/миграции/дисковые отказы/полный accessibility regression; HERE, routing и GPS. Риски: быстрый iOS ввод ранее потерял символы, посимвольный тест не доказывает исправление пользовательского ввода; требуется отдельное воспроизведение и fix при подтверждении. ANR системы/launcher наблюдались в CI и локально, ресурсная гипотеза требует наблюдения на следующих запусках. AsyncStorage остаётся одним незашифрованным локальным snapshot без auth/sync. Следующий ограниченный шаг — проверить быстрый ввод/вставку десятичных значений iOS и обеспечить неизменность введённого значения до сохранения, прежде чем добавлять доменные возможности. Локальный стенд оставлен запущенным (API/Metro ready, контейнеры healthy, выбранный Android booted).

## Продолжение: быстрый ввод профиля на iOS

Задача ограничена потерей символов при вводе, без SDK/маршрутизации/новых доменных возможностей. Сверены git status (чистый), форма, тесты и installed RN 0.84 TextInput: value инициирует обратную синхронизацию text/selection с native; defaultValue используется для исходного значения. Официальная документация https://reactnative.dev/docs/textinput описывает controlled value и defaultValue; это основание для изменения, не доказательство конкретной причины всех dropped events.

План/изменения: apps/mobile/src/TruckProfileForm.tsx — DraftInput с неизменным defaultValue на сессию, без value, с получением onChangeText для validation; поля remount только при смене mode или явном Restore (revision), включая Restore в уже выбранном m/kg. Никаких debounce/округления/преобразования во время ввода. __tests__/TruckProfileForm.test.tsx — пакет последовательных native change events и полной строки в одном act, точная SI validation и сохранность draft после unit round trip; ProfilePersistence.test.tsx — восстановление текущего mode и сохранность draft после Delete. XCTest возвращён к field.typeText всей строки без per-character ожидания, затем проверяет полное field.value до Validate/Save и точный SI summary после restart/restore. docs/audit.md и mobile README описывают результат/границы.

Локально typecheck прошёл. Первый mobile Jest run: 18 passed, 1 timeout 5s; повтор без изменения timeout прошёл 19/19 за 2.5s. После добавления same-mode Restore assertion нужен повтор. Это JS/component проверка, не подтверждение native rapid typing. До macOS CI новый XCTest не объявлен успешным. Физические устройства, paste через системный clipboard, autocorrection/IME и другие iOS версии требуют отдельных проверок.

После same-mode Restore assertion локальный Jest повторён: 19/19, 5 suites, 3.542s; lint/typecheck и diff --check прошли. Code commit ed72e251badcb234b8d006423d7459c54b3a425f опубликован с проверкой blob SHA/дерева b66ba116634fa4f6f879a100138f34da9384b665. Run 39024269246: checks success, native jobs на момент записи выполняются.

Локальный Android проверен через реальные ADB UI действия, не mock: сначала Restore -> No saved profile, затем synthetic rigid profile в ft+in/lb, Validate с exact SI, Save, force-stop/start, Restore с exact SI, Delete, force-stop/start, Restore -> empty. Сценарий завершился exit 0; screenshot restored сохранён в ignored artifacts/rapid-input/android. Android native binary не менялся (JS-only изменение формы), Metro отдаёт новый JS. Это не замена iOS rapid typing проверки. Тестовый snapshot удалён.

Первый native rapid run 39024269246: checks и Android success, iOS failed до Validate/Save. Artifact 12097921778 SHA-256 fa78e7863456318121041cd58301aaf4f854230ce5f44398ed39a68b8d2ba09b проверен. XCTest ожидал Profile name Synthetic iOS, hierarchy показывает Setic iOS. Переход только на defaultValue недостаточен; исправление не объявлялось завершённым.

Следующее изменение в той же задаче: drafts и inches переведены в useRef, текст не требует React commit на каждом onChangeText. setValidated/setErrors вызываются лишь при наличии результата/ошибок, которые надо снять. Unit mode и Restore revision остаются state для явного remount; validation читает актуальный mutable draft. Добавлен React Profiler assertion: пакет ввода в незавалидированную форму не делает commits, при этом exact SI validation и unit draft restoration проходят. Первый Profiler assertion обнаружил один лишний commit от no-op setter; setter calls теперь пропускаются явно. 19/19 mobile tests прошли (2.728s), typecheck/lint прошли до последней guard правки и будут проверены CI снова. iOS XCTest без per-character synchronization сохранён без ослабления. Это новая гипотеза об устранении React/native contention, native результат ещё не подтверждён.

Code commit 601a9d2780c8296d2437c48bb509869a31dc2e2d опубликован с проверкой дерева 7654d8d7226ea14f625b13f3706bac67dfd6a500. CI 39025033245 checks success; native jobs на момент записи ещё выполняются. Локальный полный Android ADB storage сценарий повторён именно с ref-based drafts и снова прошёл: exact SI validation/save/restart/restore/delete/restart/empty, exit 0. Синтетическая запись удалена. Старый native binary допустим для этого JS-only изменения; зависимости/нативные библиотеки не изменялись.

Run 39025033245: checks success, Android failed из-за Quickstep ANR (artifact 12098776034 SHA-256 5f8683e326a86c757c253d58eccaf87966da5cff17bd89cade68004e2b08457f проверен), iOS rapid XCTest снова failed на имени Stic iOS. iOS artifact 12098471452 SHA-256 911b3a34e1ead2db00023aca3c6a17e759592a86f6e56b8597e49474b0394caf проверен. Отсутствие React commits не устранило native failure; гипотеза о JS-state как достаточной причине отвергнута.

Найден upstream open issue https://github.com/react/react-native/issues/58904 (авторский reproducer на других версиях RN/iOS): same-character attributed-text comparison в focused Fabric TextInput может вызвать setAttributedText и потерю key in flight, включая uncontrolled поле. В installed RN 0.84 такой comparator присутствует, но прямой native trace на нашем Mac не получен, совпадение причины остаётся гипотезой. Непроверенный private-method swizzle не добавляется. В нашей форме единственный explicit text attribute — color; следующий узкий эксперимент убирает custom color на iOS, Android цвет сохраняет. Никаких символов-заглушек, retry ввода или ослабления exact assertions нет.

Android CI стабилизация: в .github/workflows/ci.yml через documented pre-emulator-launch-script runner задаются 720x1600 и density 280 вместо 1080x2400/density420: логическая площадь та же, framebuffer 44% исходного, RAM остаётся 4G, API35/x86_64. Это эксперимент снижения software-rendering нагрузки; не доказанная причина ANR. Input script сверён с primary action.yml https://raw.githubusercontent.com/ReactiveCircus/android-emulator-runner/main/action.yml ; свойства AVD присутствуют в установленном config.ini. Устаревший -dpi-device проверен через emulator -help и не используется. Тесты shell/ANR не обходятся.

Run 39025983628: checks success; iOS снова failed на имени Setic iOS. Artifact 12098942077 SHA-256 62e52c734a8cf97fdeb5f55e8d3b9bae08e3e3d202b2aa13b232f3ea9b3d96e0 проверен. Удаление custom color недостаточно, прежний стиль восстановлен. Android failed до smoke: многострочный pre-emulator-launch-script runner запускает построчно, shell exit127. Ошибка собственной CI настройки исправлена: один вызов node scripts/configure-ci-avd.cjs; две unit проверки duplicate/missing keys и сохранности остальных AVD settings прошли. Полный test:scripts 20/20, lint этого скрипта прошёл. В workflow avd-name: test задан явно.

Для той же задачи быстрого ввода добавлен iOS adapter над UIKit UITextField: src/ProfileInput.tsx — контракт и Android RN adapter; src/ProfileInput.ios.tsx — iOS native event adapter; ios/TruckRouteSavings/TRSProfileInputManager.mm — native buffer, initialText только один раз, editing lock, label, три keyboard kinds и точные text change events; Xcode project включает исходник. DraftInput теперь зависит от интерфейса ProfileInput. Native UIKit не получает value/selection updates из JS; unit switch/Restore всё ещё создают новую сессию. Никаких private swizzle/RN patches/dependency upgrades или новых SDK нет. Официальные API сверены до реализации: https://reactnative.dev/docs/0.84/legacy/native-components-ios , https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here (interop), https://developer.apple.com/documentation/uikit/uitextfield . RN 0.84 установленный source содержит legacy component interop; фактическая совместимость требует Xcode/runtime CI. Ограничение: RCTViewManager interop legacy, будущая миграция на codegen/Fabric — отдельная задача.

Jest moduleNameMapper явно использует Android/default adapter для прежних form/component tests; отдельный ProfileInput.ios.test.tsx проверяет iOS adapter с mocked native host (не native success). Исправлен mock requireNativeComponent.default. Mobile 20/20 (6 suites), typecheck прошёл; lint inline-style warning устранён. Настоящий iOS rapid XCTest остаётся без per-character ожидания, проверяет полные поля до Save и SI после restart. Native adapter до macOS CI не считается рабочим. Системный clipboard/IME/VoiceOver/dark mode/physical/release не проверены.

Run 39026990908 на f85327e547df55f45e91a420ffcd610c6ce65d3b: checks и Android success, iOS native build/deployment install/shell success, persistence XCTest failed ДО ввода: app.textFields[Profile name] не найден. Artifact 12099151981 SHA-256 1893a558be07f1e8ffe07ad60ba1b9c5165852ffa2ccbdacdb977a2d5bed9c6a проверен. Hierarchy показывает все шесть input controls как Other с нужными labels и ненулевыми 48pt frames; значит registration/rendering прошли, accessibility type не сохранён при экспорте UITextField subclass как RN view. Это не результат native rapid typing.

Исправлен UIKit adapter: экспортируется UIView-контейнер, обычный UITextField — внутренний accessibility element; UIKit label/enabled/text/keyboard направлены только дочернему полю. Размер child задаётся layoutSubviews внутри bounds контейнера. Это соответствует официальной RN рекомендации wrapper UIView для native controls. Тест не переключался на Other и не терял проверку реального TextField; ожидается следующий native run.

Для итогового отчёта этой итерации (база d3f76758fd0c2f5e4770ac387ae3d5ba1e5b0ee0) изменены: .github/workflows/ci.yml; apps/mobile/README.md; apps/mobile/src/storage/README.md; apps/mobile/__tests__/ProfileInput.ios.test.tsx; apps/mobile/__tests__/ProfilePersistence.test.tsx; apps/mobile/__tests__/TruckProfileForm.test.tsx; apps/mobile/ios/TruckRouteSavings.xcodeproj/project.pbxproj; apps/mobile/ios/TruckRouteSavings/TRSProfileInputManager.mm; apps/mobile/ios/TruckRouteSavingsUITests/FoundationSmokeTests.swift; apps/mobile/jest.config.js; apps/mobile/src/ProfileInput.ios.tsx; apps/mobile/src/ProfileInput.tsx; apps/mobile/src/TruckProfileForm.tsx; docs/audit.md; scripts/configure-ci-avd.cjs; scripts/configure-ci-avd.test.cjs.

Wrapper fix опубликован в code commit 066a00c7f8a272c7aa4b3742b02e7f70aaab845b с проверкой дерева 8c54361694cf5f34b473832b5558f1253aa7b51b. Run 39027860871: checks success; iOS native build/deployment install success, XCTest и Android device smoke на момент записи выполняются. Окончательный результат фиксируется ниже, native rapid typing не объявляется успешным по одному build.

ИТОГ 2026-10-17: run https://github.com/noname33-cmd/123/actions/runs/39027860871 на code commit 066a00c7f8a272c7aa4b3742b02e7f70aaab845b завершён success во всех jobs (checks/android/ios). Проверены frozen install, build, lint/typecheck; 41 unit/component tests (profile14/mobile20/database3/API3/navigation1), 20 script tests, HTTP E2E2, PostgreSQL/PostGIS integration2, реальные PostGIS/Redis probes. Android strict dependency resolution/APK/negative missing-lock/unchanged locks/device smoke success. iOS deployment pod install/native build и 2 XCTest success: shell13.198s, profile100.972s, всего114.170s, 0 failures. UIKit поля обнаружены как TextField; каждый fixture введён целой строкой одним typeText без per-character waits/retries, полное native value сверено до Validate/Save. Restart/restore/exact SI/delete/restart/empty прошли.

iOS artifact 12099636619 (2878186 bytes) скачан; SHA-256 f2de6398041fd4f036fe889eefe908c40e7da370ffd101d64d3cc4e2b0dcfa02 совпал с digest. Logs/manifest/png извлечены с проверкой путей. Screenshot profile-restored просмотрен: настоящие поля содержат width2.5908, length18.288, mass36287.3896, axes5; summary содержит height4.1148/width2.5908/length18.288/mass36287.3896. Наличие Metro debug banner не мешало bundled JS; CI Metro для iOS не требуется. Android CI в обоих последних runs success без автоматического закрытия ANR; ресурсная гипотеза окончательно не доказана. Последующая публикация только README/storage README/audit с [skip ci] не меняет tested code commit.

Оставшиеся ограничения/не выполнено: iOS physical/другие OS/release signing, системный paste/IME/диктовка/VoiceOver/dark-mode/полный editing-selection regression, reboot/uninstall/backup, native storage I/O corruption scenarios. Legacy RCTViewManager interop требует контроля при обновлении RN; UIKit adapter ограничен контрактом профиля, не full TextInput API. Точная native причина старого Fabric сбоя не установлена debugger trace: upstream58904 — сходный открытый дефект, не доказанная идентичность; production fix использует собственный публичный UIKit adapter без private swizzle/patch. Замедление XCTest не использовалось для получения pass. Routing/GPS/SDK HERE не добавлялись. Следующий ограниченный шаг — проверить редактирование уже валидированного профиля/замену выделенного текста/системную вставку и клавиатуру на iOS; дальнейшие доменные возможности отдельно. Локальный Android stand остаётся запущенным; синтетический snapshot удалён.

## Проверка редактирования валидированного профиля

Перед изменениями: git status чистый, HEAD 0e040ffbaa9e286f6702821ea922820ed22395bf; сверены UIKit adapter, форма, persistence guard, XCTest и документация. Задача ограничена заменой выделенного текста/повторной валидацией/сохранением, без новых доменных функций и SDK. План/файлы: apps/mobile/ios/TruckRouteSavingsUITests/FoundationSmokeTests.swift, apps/mobile/__tests__/ProfilePersistence.test.tsx, apps/mobile/README.md, docs/audit.md.

XCTest существующего persistence сценария расширен после Restore: проверяется прежняя native mass36287.3896, фокус, Command-A через XCUIElement.typeKey(String, modifierFlags: .command), замена целой строкой30000.123456789, точный native value, ожидание disabled Save и отсутствие прежнего validated summary; затем Validate/точная SI сводка/Save/restart/Restore/точная новая сводка/profile-replaced screenshot/Delete/restart/empty. Per-character waits/retries и ввод программной установкой поля не используются. Это whole-selection replacement клавиатурной командой, не системный clipboard paste и не частичное выделение диапазона. API сверён с primary Apple documentation JSON: https://developer.apple.com/tutorials/data/documentation/xcuiautomation/xcuielement/typekey(_:modifierflags:)-9ubn.json — String signature, iOS/iPadOS, Xcode introduced16.3; наш CI16.4/iOS18.5. Native результат до CI не объявляется успешным.

Компонентный persistence test с реальным JsonTruckProfileStore (in-memory KeyValueStorage port) проверяет invalid mass0 после Restore: disabled Save и guard даже при вызове handler; Validate не разрешает запись; исходный JSON/число setItem вызовов не меняются. После valid replacement30000.123456789 требуется Validate, ровно одна запись, exact mass string и восстановление поверх другого draft. Mobile Jest21/21 (6 suites,2.970s), lint/typecheck прошли. Код приложения не менялся: на JS уровне ошибки новым тестом не обнаружены. Следующий шаг — фактический macOS XCTest; physical devices/clipboard/частичные диапазоны/IME не проверялись.

Итог проверки редактирования: https://github.com/noname33-cmd/123/actions/runs/39029700776 на tested commit ff847dfef5c2d371b84d64c22662bba407df1f9a — checks/android/ios success. Публикация сверена по каждому blob SHA и полному дереву8a6adbda44059875b8dec2bd18a6e9efa58fff51. CI проверил frozen install/build/lint/typecheck; unit/component42 (mobile21/profile14/database3/API3/navigation1), script20, HTTP E2E2, real PostGIS integration2 и PostGIS/Redis probes. Android strict-lock/APK/negative missing-lock/unchanged locks/UI smoke success. iOS deployment install/build и2 XCTest success: shell8.990s, persistence+replacement100.405s, всего109.395s,0 failures. Полное значение заменено через реальный Command-A/typeText; disabled Save дождались predicate, старый validated summary снят; новая validation/save/restart/restore/exact SI/delete/restart/empty прошли. Native adapter и app code не менялись, ошибок в проверенном сценарии не обнаружено.

Artifact12099728871 (3743792 bytes) скачан: SHA-256 c2e2ce133fe78ba3c6bbb1861c95a2c4860853f99ac19f30c052175d08d932f8 совпал. Logs/manifest/png извлечены с проверкой путей в ignored artifacts/ci-ff847df. Screenshot profile-replaced визуально проверен: native mass30000.123456789 и тот же точный SI summary после restart; остальные видимые поляwidth2.5908/length18.288/axes5 не изменились. Синтетический snapshot удалён успешным сценарием. Документационный follow-up с [skip ci] меняет только apps/mobile/README.md и docs/audit.md; проверенный код — commit выше.

Изменённые файлы задачи: apps/mobile/__tests__/ProfilePersistence.test.tsx; apps/mobile/ios/TruckRouteSavingsUITests/FoundationSmokeTests.swift; apps/mobile/README.md; docs/audit.md. Локально мобильные21 tests/lint/typecheck и diff --check прошли; local:status API/Metro ready, containers healthy, выбранный Android booted. На Windows XCTest не выполняется, результат получен в настоящем macOS CI. Повтор local Android storage E2E не выполнялся (production код не менялся; Android CI smoke прошёл).

Не выполнено: системный clipboard paste, частичное выделение/замена диапазона, IME/диктовка/сторонние клавиатуры, VoiceOver/dark mode, physical devices, другие OS и release. Whole-selection keyboard replacement не доказывает эти сценарии. Legacy interop и ранее наблюдавшиеся системные ANR остаются границами поддержки/наблюдения; в этом прогоне ANR не было. Следующий ограниченный шаг — проверить системную вставку и частичное редактирование числового значения на iOS без потери точности и без сохранения invalid draft. Routing/GPS и новые доменные функции в этой итерации не реализовывались.

## Проверка partial selection и same-app system clipboard

Перед изменениями: git status чистый, HEAD99cb21a03f0dafd0138ecf6ce8398b504278c244; сверены XCTest, verify-ios runner, UIKit adapter, component tests и CI. Одна задача — native partial numeric selection и system clipboard copy/paste внутри приложения, без новых SDK/доменных функций. План/изменённые файлы: apps/mobile/ios/TruckRouteSavingsUITests/FoundationSmokeTests.swift; apps/mobile/__tests__/ProfilePersistence.test.tsx; apps/mobile/README.md; docs/audit.md.

В существующий native persistence XCTest после ввода30000.123456789 добавлены три Shift+Left (XCUIKeyboardKey.leftArrow), typeText125 и exact field.value30000.123456125. Затем Command-A/Command-C копируют всё значение в системный buffer, typeText1 заменяет поле (exact1 проверен), Command-A/Command-V вставляют скопированную строку (exact30000.123456125 проверен). Это не программное присваивание native text и не typeText вместо Paste. Дальше обязательны disabled Save/снятая validation/Validate/exact SI/Save/restart/Restore/exact SI/profile-pasted screenshot/Delete/restart/empty. Симулятор disposable, clipboard содержит только synthetic fixture. Cross-app paste permission prompts/menu Paste и произвольный диапазон вместо последних3 цифр не проверяются этим сценарием.

Apple API сверены: https://developer.apple.com/documentation/xcuiautomation/xcuikeyboardkey/leftarrow и https://developer.apple.com/documentation/xcuiautomation/xcuielement/keymodifierflags ; official JSON xc uikeyboardkey содержит leftArrow. String typeKey signature ранее проверена для Xcode16.4/iOS18.5. CI должен фактически подтвердить Shift+Left/C/V, результаты не объявляются до выполнения.

JS component regression расширен invalid inputs0/30,000.123456125/empty; каждый после Restore снимает validation, Save handler guard не вызывает setItem, исходный JSON неизменен, Validate не разрешает запись. Все21 mobile tests прошли (6 suites,17.953s); typecheck/lint выполняются отдельно. Production код не меняется, пока проверки не выявили ошибку. Следующий шаг — macOS CI и просмотр native screenshot/log.

Commit7772a6c3e0919099839a1f091c0d9828ea50059f опубликован после проверки blob SHA и дереваbe496f912c9fa1ef0343f0aefa12cc7a9e7facca. Локальные typecheck/lint завершились success. Run39030732736: первый checks job117390487431 failed в test:database с общим сообщением Docker database test command failed; подробная причина Docker скрыта harness, rate-limit/daemon/image причины НЕ установлены. До этого frozen install/build/lint/typecheck/unit-component42/script20/HTTP E2E2 прошли. Native jobs не прерывались. План — повтор checks на том же commit после завершения workflow; нельзя считать первый failure success.

Для проверки Docker/DB пути локально выполнен test:database: две настоящие PostGIS integration проверки прошли, compiled API startup/HTTP/shutdown и rejection missing configuration прошли, созданный временный контейнер/volume удалены. Это не использует базу локального приложения и не объясняет CI failure. Local:status API/Metro ready, containers healthy, emulator booted. Android CI success; native iOS на момент записи ещё выполняется.

Native итог run39030732736: Android и iOS success. iOS artifact12100622271 (3964159 bytes), SHA-256433dfe63b54f20ba924088c139d0e4f1ce16cd78915a9e04c0b3b4b5f380bf4e проверен. Logs/manifest/png извлечены с проверкой путей в ignored artifacts/ci-7772a6c. 2 XCTest,0 failures,176.738s: shell21.438s, расширенный persistence155.300s. Shift+Left x3/typeText125 дали30000.123456125, Copy/temporary1/Paste вернули точную строку; disabled Save/Validate/Save/restart/Restore/exact SI/Delete/restart/empty прошли без input retries и per-character waits. Screenshot profile-pasted визуально проверен: native mass и summary30000.123456125, width2.5908/length18.288/axes5 сохранены. Snapshot удалён успешным сценарием. Это same-app system clipboard keyboard commands; экранное меню и cross-app permission prompts не тестировались.

После завершения workflow запущен повтор только checks job117390487431 на том же commit7772a6c (новый job117393020309); GitHub принял rerun. Native jobs не выполнялись повторно; их результаты сохранены. На момент записи checks повтор ещё выполняется.

Окончательный итог: run https://github.com/noname33-cmd/123/actions/runs/39030732736 на tested commit7772a6c3e0919099839a1f091c0d9828ea50059f после повтора checks завершился success во всех jobs. Повтор checks117393020309 подтвердил frozen install/build/lint/typecheck, unit/component42 (mobile21/profile14/database3/API3/navigation1), script20, HTTP E2E2, real PostGIS integration2, compiled API startup/HTTP/shutdown/missing-config rejection, PostGIS/Redis probes. Android strict locking/APK/negative missing-lock/unchanged locks/UI smoke success; iOS2 XCTest/0 failures176.738s подтверждены artifact выше. Первый Docker failure не скрыт и не объявлен доказанным network/rate-limit/daemon сбоем; причина остаётся неизвестной. Повтор выполнен без изменения кода и без отключения проверок.

Файлы этой задачи: apps/mobile/ios/TruckRouteSavingsUITests/FoundationSmokeTests.swift; apps/mobile/__tests__/ProfilePersistence.test.tsx; apps/mobile/README.md; docs/audit.md. Production код не менялся; ошибок в проверенном native сценарии не обнаружено. Итоговый документационный commit с [skip ci] меняет только README/audit; native и JS результаты относятся к code commit7772a6c.

Не выполнены/границы: Paste через экранное меню, cross-app clipboard и privacy prompts, произвольная/срединная selection (проверен suffix3), сторонние keyboard/IME/диктовка/VoiceOver/dark-mode, physical devices/другие OS/release. Invalid comma/empty/zero проверены на компонентной границе, не native clipboard. Same-app keyboard clipboard success не доказывает эти случаи. Legacy interop требует контроля при RN upgrade; первый CI Docker сбой остаётся наблюдением с неизвестной причиной. Следующий ограниченный шаг — экранное меню Paste/вставка из другого приложения с явной проверкой системных разрешений; дальнейшие доменные функции отдельно. Локальный stand оставлен работающим; тестовые native snapshots удалены, CI disposable Simulator удалён workflow.


## 2026-10-17 — Design 01: визуальный прототип

База e6c822f706180029474d66118f5ddc8bc49e4752, рабочее дерево до задачи чистое. Ограниченная задача: дизайн входа, главной и профиля; без production UI и auth integration. Файлы: docs/design/prototype.html, docs/design/README.md, docs/audit.md. Переиспользован существующий assets/brand/truck-route-savings-logo-v1.png.

Создан HTML-прототип с English UI, navy/forest-green палитрой, двумя типами транспорта, фиксированными точными US/metric примерами и явными unavailable состояниями. Save демонстрирует только состояние, хранения/API нет. Вход readonly/disabled. Исправлена согласованность названия выбранного транспорта на главной. План следующего этапа и границы описаны в design README.

Встроенный browser automation не запустился: failed to write kernel assets, os error 3. Проверка выполнена установленным Chrome через Playwright из bundled runtime, без установки пакетов. Локальный allowlist preview server 127.0.0.1:4186 обслуживает только прототип и логотип; исходники инструментов и screenshots находятся в ignored artifacts/design-preview.

Выполнены: browser interaction checks (переходы, тип транспорта/карточка, US80000 и metric36287.3896, Validate/Save/уведомление, сброс доступности Save), readonly email/password, disabled Sign in, logo loaded, отсутствие JS page errors; горизонтальный overflow страницы отсутствует при 320/390/768/1440 px. Итог скрипта exit0. Визуально просмотрены overview.png и profile-mobile.png. Проверка readonly исправлена перед финальным повтором. Поля фиксированы: настоящий input/конвертация/доменная валидация этим тестом не проверяются.

Не выполнены: native builds/tests и повтор CI (app source не изменён), физические устройства, screen readers, Dynamic Type, полный contrast audit, dark mode, реальные auth/маршруты/экономия. Проверка overflow страницы не доказывает видимость длинных значений внутри каждого поля. Следующий шаг — отдельный перенос темы/профиля в RN с соответствующими тестами; авторизация отдельным этапом до серверного хранения пользовательских данных.


## 2026-10-17 — Design 01: тема и профиль React Native

Перед изменениями прочитаны App, TruckProfileForm, ProfilePersistence, ProfileInput.ios, component tests и src README; AGENTS.md не найден. Предыдущие design docs сохранены. Ограниченная задача: перенос визуальной основы/профиля, без auth/главной/маршрутизации и изменения доменных контрактов.

Изменены apps/mobile/App.tsx, src/TruckProfileForm.tsx, src/ProfilePersistence.tsx; добавлены src/theme.ts и src/ActionButton.tsx. Новые поверхности/цвета/типографика/Pressable кнопки с selected/disabled semantics. Сохранены все4режима, refs/remount keys, native input adapter, local storage/parser и текущие подписи automation. Тесты TruckProfileForm/ProfilePersistence используют новый компонент кнопки; добавлен ActionButton.test.tsx. Обновлён apps/mobile/src/README.md.

Выполнены mobile typecheck, lint, test: 7 suites/22 tests success; build: Android и iOS JS bundles success. Первый прогон: новый ActionButton test не находил Pressable через findByType; исправлен поиск host accessibilityRole, финальный полный прогон успешен. Проверка нового компонента покрывает semantics/передачу обработчика, не физический disabled touch. Сборщик выдал только NO_COLOR/FORCE_COLOR warnings. Native binaries/CI не запускались. local status: API/Metro offline, emulator offline/booting, ownership отсутствует/изменилось, Docker status failed. Остановленные процессы не объявлены работающими; пользовательские данные не удалялись.

Не проверены: внешний вид на устройстве, APK/Xcode builds, native regression, screen readers, Dynamic Type/клавиатура/перекрытия, физические устройства. JS build не подтверждает эти свойства. Нет новой авторизации/SDK/secrets; auth provider остаётся открытым выбором. Следующая задача: поднять локальную среду и проверить дизайн профиля на Android, затем native iOS в macOS CI перед заявлением о завершении native переноса. После этого отдельная auth задача по официальной документации.


## 2026-10-17 — восстановление локального стенда и Android Design 01 QA

Прочитаны README/local commands, scripts/local.cjs и verify-android.cjs, ignored config/state. План этой задачи: восстановить запуск и проверить актуальный RN экран; исходники приложения не менять, результаты добавить в этот audit.

Причина Docker offline: Docker Desktop не запущен, named pipe dockerDesktopLinuxEngine отсутствовал. Запущен уже установленный Docker Desktop (скрытое окно); engine29.7.2 готов. Выполнены штатные local down/up, старые PID перепроверены helper; volumes не удалялись. PostGIS3.5 authenticated TCP/geography и Redis PING/write/read passed; Prisma generation, database/API/navigation/truck-profile compile, Metro warmup, emulator boot и Android shell smoke success. Актуальный JS загружен через Metro из текущего рабочего дерева; использован прежний установленный debug APK из ignored config, новой native сборки нет.

Android emulator-5554, TruckFoundationApi35,1080x2400: heading/тема визуально проверены, выбор Rigid меняет Selected, Validate доступен прокруткой, пустая форма показывает ошибки, Save disabled. Снимки profile-top.png, validation-fields.png, bottom-final.png просмотрены; нижний снимок подтверждает видимость Save/Restore/Delete без перекрытия системной navigation bar. Сценарий не выполняет save/restore/delete и не изменяет сохранённый snapshot. Временный QA script/screenshots/XML в ignored artifacts/design-device; исходники не публикуются как полноценный E2E regression suite.

Первый QA прогон искал Save сразу после Validate без дополнительной прокрутки и остановился; второй после force-stop считал XML до готовности JS и остановился на heading. Исправлены только ожидание heading и прокрутка; итоговый прогон exit0. Assertions не отключены. В emulator.log есть UpdateLayeredWindowIndirect warning Windows рамки; boot/UI checks прошли, корректность всех оконных режимов не заявляется.

Финальный local status: API ready, Metro ready, api/metro/emulator/qemu ownership verified, Android booted, PostgreSQL/Redis healthy и loopback ports. Стенд оставлен запущенным. Файл этой итерации: docs/audit.md; локальные state/log/config/evidence ignored. Предыдущие незакоммиченные UI/design изменения сохранены.

Не выполнены: новая APK/native iOS сборки, iOS device tests текущего оформления, physical devices, keyboard/увеличенный системный шрифт/screen readers, успешный save/restore flow на устройстве после редизайна, CI и полный JS повтор (production code в этой задаче не менялся). Риск: длинная форма требует прокрутки, ошибки пока используют ту же зелёную подложку, что и информационные сообщения; это требует отдельного UX уточнения. Следующий ограниченный этап — проверить keyboard/крупный шрифт и уточнить состояния ошибок, затем native iOS regression перед следующим auth этапом.


## 2026-10-17 — Android keyboard/font QA и отдельное оформление ошибок

Перед изменениями прочитаны form/theme, device helper, local status и AndroidManifest (adjustResize уже задан). Файлы этой итерации: apps/mobile/src/theme.ts, apps/mobile/src/TruckProfileForm.tsx, apps/mobile/src/README.md, docs/audit.md. Добавлен errorSurface #fff0ec, ошибки типа/полей используют #923e31 и эту подложку; success остаётся зелёным. Parser/native adapter/storage не менялись.

Выполнены mobile22 tests/7 suites, typecheck/lint success на окончательном коде. При первом редактировании Python прочитал UTF-8 как Windows encoding и исказил em dash в Rigid title: component tests это обнаружили (5 failed), исправлено явным UTF-8, полный прогон22 passed. Снимок выявил неполное применение error style (только vehicleType), исправлены также field errors, тесты и device сценарий повторены.

На emulator-5554/API35/1080x2400 font_scale изменён с1.0 на1.3: heading готов, поле Profile name достигнуто прокруткой, введено KeyboardCheck, текст присутствует в UI XML, видимость IME подтверждена dumpsys. Клавиатура закрыта Back, Validate/нижние действия достижимы, пустые числовые поля дают errors/Save disabled. Просмотрены large-font-keyboard.png и окончательный large-font-errors-bottom.png: поле имени над IME, ошибки красные, подписи и нижние действия читаемы. В каждом прогоне finally вернул font_scale1.0; snapshot save/restore/delete не вызывались. Evidence/helper в ignored artifacts/design-device.

Промежуточные device failures: screencap превысил default Node buffer (ENOBUFS), увеличен до8MiB; затем XML содержал частично видимый input и tap попал в system navigation, сценарий проверял foreground неверно/текст не появился. Добавлена проверка видимых bounds перед tap; итоговые два прогона success, последний на окончательном field error style. Эти ошибки не выданы за product bugs и не скрыты. Нативные input callbacks/selection не менялись.

Не выполнены: числовая IME/другие клавиатуры, действия при всё ещё открытой IME (проверены после Back), 200%/другие screen sizes, TalkBack/VoiceOver, iOS Dynamic Type/device tests, новые APK/Xcode build/CI, успешный save flow на устройстве в этой задаче. JS bundles повторно не собирались, актуальный JS проверен через Metro. Стенд оставлен запущенным; исходный системный масштаб восстановлен. Следующий этап — native regression текущего UI и подготовка выбора auth provider отдельной задачей, без добавления аккаунтов в текущую итерацию.


## 2026-10-17 — Android exact numeric input и исправление перекрытия IME

Прочитаны local status, form/input, device helpers. API/Metro/Android ready, ownership verified, PostGIS/Redis healthy. Исходный план — числовой QA и docs; после обнаружения перекрытия поля массы план расширен до исправления Android focus scroll (объявлено пользователю до edits). Файлы: apps/mobile/App.tsx, src/ProfileInput.tsx, src/TruckProfileForm.tsx, __tests__/TruckProfileForm.test.tsx, src/README.md, docs/audit.md. App.test.tsx временно менялся для пробного keyboard listener test; этот тест удалён вместе с отвергнутой реализацией.

Первый device numeric сценарий (до исправления) проверил все6 inputs: NumericCheck,4.1148,2.5908,18.288,30000.123456789,5. Настоящая IME присутствовала; exact SI summary совпала, Save enabled после Validate, после дописывания9 к массе30000.1234567899 Save disabled/успех исчез. Save/Restore/Delete не нажимались. Однако screenshot показал поле массы под IME — XML text success не подтверждает видимость.

Промежуточные реализации KeyboardDidShow со scrollResponderScrollNativeHandleToKeyboard, компенсация safe-area через native measure, window geometry и KeyboardAvoidingView не прошли строгую проверку границ поля; они удалены. Их успешные unit/JS проверки не объявлены device success. Typecheck обнаруживал неверный mock EmitterSubscription и measureInWindow на ScrollView вместо native ref; исправленные промежуточные варианты впоследствии удалены. Новый form test сначала разрешил iOS module вместо .tsx из-за Jest mapping, исправлен explicit require ProfileInput.tsx. Временный QA сначала нажимал подпись вместо input, потом крупными свайпами пропускал поля; helper исправлен, assertions сохранены. Во время одной проверки проводилось hot reload, поэтому её одного недостаточно; окончательный полный сценарий повторён после завершения всех production edits. Попытка остановки собственного intermediate helper проверила PID/command line, процесс уже завершился, Stop-Process сообщил absent; чужие процессы не трогались.

Окончательное решение: Android ProfileInput с ref измеряет windowY при focus, форма передаёт callback в App, ScrollView учитывает текущий offset и своё положение и поднимает поле с отступом16; текст/defaultValue/native editing session не меняются. ProfileInput.ios.tsx/UIKit adapter не изменены. Нет global keyboard subscriptions/KAV/таймеров в окончательном коде.

Выполнены на окончательном коде: typecheck, lint,23 tests/7 suites, Android/iOS JS bundles success (только NO_COLOR/FORCE_COLOR warning). Focus device QA: exact30000.123456789 при видимой IME, полные bounds103,668–979,794 на1080x2400, выше клавиатуры; decimal-keyboard-fixed.png просмотрен. После этого полный numeric scenario повторён: шесть exact values, IME, exact SI summary, Save enabled после Validate и disabled после mass edit — success/exit0. Evidence/helpers в ignored artifacts/design-device. Никаких snapshot writes; стенд оставлен работающим.

Не выполнены: новые APK/Xcode native builds, iOS regression/CI, физические устройства, сторонние IME, ручные нажатия каждой клавиши, успешный save/restart/restore на устройстве в этой итерации,130% после последнего focus-scroll изменения, переходы между полями при уже открытой IME. Android input text commands не имитируют все особенности IME. Следующий ограниченный шаг: native Android/iOS regression текущего UI; авторизация остаётся отдельной задачей после этого, провайдер не выбран.


## 2026-10-18 — публикация дизайна и native CI, исправление XCTest reveal

Изучены staged diff/CI/tests/local status. Опубликованы13 source/docs файлов накопленной дизайн-итерации в commit2d07d4d05ba5429fc43054b9807620c99a7df2db, remote tree53893c53b8d3fc0096398f2bc28e06c546b6e088 совпал с локальным index. .env/tools/APK/screenshots/node_modules не включены. До публикации root lint/typecheck/test success; mobile23, общий unit/component44. Локальная ветка синхронизирована без reset; единственное unstaged изменение App.test.tsx было только EOL, восстановлено из index.

Run https://github.com/noname33-cmd/123/actions/runs/39059689983: checks success117474914112, Android success117474913741, iOS failure117474914097. Checks подтвердил frozen install/build/lint/typecheck,44 unit/component,20 scripts,2 HTTP,2 real PostGIS integration, compiled API startup/HTTP/shutdown/missing-config rejection, PostGIS/Redis probes. Android BUILD SUCCESSFUL4m18s, strict missing-lock rejection/unchanged lock checks и emulator shell passed. Artifact12111460074 SHA25617f304f17b8a912315c60788b894552282e7880121bfaa9b2f55bc936a513f67 сверена, screenshot720x1600 просмотрен. APK artifact12110853490 digest31eb4ac4874fec2ebc4a91cef568101d0866f64f2ed33f54ccd4f9140dca2ce2 опубликован CI; сам APK локально повторно не устанавливался.

iOS build success, shell XCTest12.404s success, persistence failure147.913s;2 tests/1failure160.317s. После save/restart/restore exact SI test reveal(Current gross mass kg) не смог сделать field hittable: hierarchy field frame64,57.3,265,22, viewport safe area начинается59; значения/сводка36287.3896 и restored message присутствуют. Reveal20раз двигал только вниз, хотя поле уже выше viewport. Это доказанный недостаток поиска в тесте; успешность оставшихся selection/clipboard/save/delete шагов не заявляется. iOS failed artifact12110734748, declared size166344546, digest724ef30d75df02d031b8a539b307eff063ed4123ceb34355b15875469349f613; загрузка запрошена в ignored evidence. Запрос job log до completion ожидал сервер; после completion лог получен отдельным read-only запросом.

Перед изменением объявлен план: FoundationSmokeTests.swift, mobile/src/README.md, docs/audit.md. Reveal выбирает направление, сравнивая frame элемента с ScrollView viewport; лимит20 и asserts existence/full app frame/hittability сохранены. Production код не изменён. Swift/XCTest локально на Windows не компилировались: требуется новый macOS CI. Следующий шаг этой же задачи — опубликовать fix и дождаться повторного native результата. Native physical devices/accessibility/large-font/IME matrix/auth не входят в этот прогон.
