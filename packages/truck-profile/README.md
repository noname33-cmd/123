# Truck profile contract v1

Чистый TypeScript-пакет без React/Nest/Prisma/SDK dependencies. По подтверждённому выбору пользователя поддерживаются оба типа `VehicleType`: `rigid-truck` — одиночный грузовик без прицепа; `tractor-semitrailer` — тягач с одним полуприцепом. Парсер сохраняет выбранный тип; другие типы отклоняются без преобразования.

`parseTruckProfile(unknown)` возвращает `{ok: true, value}` либо `{ok: false, issues}` с field/code без исходных значений. Вход — plain object с обязательными собственными полями; неизвестные поля отклоняются. В частности, нельзя незаметно отбросить hazardousCargo и объявить такой ввод успешно принятым. Выход — новый frozen object; исходный input не изменяется.

Для одиночного грузовика общие измерения относятся ко всему автомобилю без прицепа; для тягача с полуприцепом — ко всему составу. В обоих случаях учитывается груз. Отдельные размеры компонентов не задаются.

Поля:

- `schemaVersion`: число 1.
- `vehicleType`: строка `rigid-truck` или `tractor-semitrailer`.
- `name`: непустое имя, внешние пробелы удаляются.
- `overallHeightMeters`, `overallWidthMeters`, `overallLengthMeters`: заявленные текущие внешние габариты всего состава, включая груз/выступающие части, в метрах.
- `currentGrossMassKilograms`: заявленная текущая масса всего состава, включая груз, топливо и находящихся в нём людей, в килограммах; не паспортный максимально разрешённый вес.
- `totalAxleCount`: положительное safe integer, все физически установленные оси состава, включая подъёмные; не число осей, находящихся под нагрузкой.

Габариты и масса — **десятичные строки**, не JS numbers. Экспортируемые branded types `Meters` и `Kilograms` несовместимы между собой. `parseMeters`/`parseKilograms` проверяют положительное десятичное значение, удаляют внешние пробелы/избыточные нули, сохраняют все значащие цифры без Number/parseFloat/округления. Scientific notation, запятые, единицы внутри строки, negative/zero, null/unknown и числовые значения отклоняются. У технической проверки axle count нет придуманного максимума из правил грузовых маршрутов.

Положительные значения и корректный формат **не подтверждают** физическую правдоподобность, road legality, наличие разрешений или готовность navigation. Дорожные пределы, default размеры/вес, типовые legal maxima и правила провайдера не задаются. Тестовые значения синтетические, не defaults или советы водителю. Все значения заявлены вызывающей стороной и не измерены приложением.

Пакет используется mobile формой и локальным storage adapter для проверки профиля, но не backend endpoint. Локальный SI snapshot реализован отдельно в apps/mobile/src/storage; backend persistence, migrations, profile id/ownership/auth, trailers по отдельности и hazmat/permits — отдельные задачи. Денежные значения не реализованы. Маппинг осей/габаритов/массы в HERE требует отдельной проверки официальных определений, лицензии и SDK совместимости; контракт не является HERE options и не делает NavigationEngine доступным.

Точные односторонние конвертеры feetToMeters/inchesToMeters/poundsToKilograms принимают unknown и возвращают MeasurementResult<Meters/Kilograms>. Положительные decimal strings умножаются через BigInt coefficient и decimal scale, без float, округления или потери цифр; наружу возвращаются только branded строки. Ошибки формата/нуля совпадают с SI parser. Нет обратных конвертаций, fractions/slash или предположений о единицах.

feetAndInchesToMeters(feet: unknown, inches: unknown) принимает два обязательных компонента-строки: целые неотрицательные футы и десятичные дюймы в [0,12). Внешние пробелы/ведущие нули допустимы; пустое поле не заменяется нулём. Суммарная длина должна быть положительной. Точный расчёт (feet × 12 + inches) × 0.0254 выполняется с BigInt и общей decimal scale. CompoundLengthResult возвращает Meters либо коды expected-whole-feet, expected-inches-below-twelve, must-be-positive; исключения для невалидного пользовательского формата не выбрасываются. Граница 12 — правило составной записи, не truck routing limit. Строка `13 ft 6 in` в одном поле не разбирается; UI предоставляет отдельные поля.

Источники: [NIST Handbook 44 (2023), Appendix C](https://www.nist.gov/system/files/documents/2023/01/30/appc-23-HB44.pdf), страницы C-10/C-11 и C-20/C-22: international ft = 0.3048 m, in = 0.0254 m, avoirdupois lb = 0.45359237 kg. Это точные определения; U.S. survey foot, troy pound и pound-force не используются. Коэффициенты сверены 2026-10-15. Значения в тестах синтетические, не разрешённые дорожные максимумы.

Из корня (pnpm 10.28.2):

```sh
pnpm --filter @truck/truck-profile build
pnpm --filter @truck/truck-profile typecheck
pnpm --filter @truck/truck-profile lint
pnpm --filter @truck/truck-profile test
```

Root Turbo pipeline автоматически включает workspace. Type tests проверяют запрет смешивания единиц и обхода валидации через bare string; runtime tests — сохранение точности, неполный/неизвестный ввод, отсутствие defaults/fallback, aggregation ошибок и неизменность input. Mobile объявляет явную workspace dependency; для новых consumers также добавляйте её явно.
