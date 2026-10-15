# API foundation

Команды запуска и проверки — в корневом README. NestJS 11, process liveness на `GET /health`, loopback listener. DatabaseModule подключает PostgreSQL через DatabaseConnection port и Prisma adapter; cache и бизнес-endpoints пока отсутствуют.

DATABASE_URL обязателен в process environment. До listen Nest lifecycle подключается к DB и проверяет PostGIS; неуспех останавливает startup. app.close/SIGTERM через shutdown hooks закрывает Prisma pool. /health остаётся process liveness и не является DB readiness после успешного startup. Данные авторизации и URL не выводятся в startup errors.

Unit tests проверяют ответ контроллера, отказ startup и cleanup lifecycle. HTTP suite поднимает Nest application с явной test-only подменой database provider и проверяет health/404; в runtime такой подмены нет. `pnpm test:database` из корня поднимает отдельный одноразовый PostGIS и выполняет integration suite с настоящим adapter, PostGIS query, shutdown и неверным паролем. Dev использует TypeScript compiler с decorator metadata, совпадающим с production build. Моделей, миграций, routing и GPS нет.
