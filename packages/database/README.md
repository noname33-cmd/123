# Database connection foundation

`DatabaseConnection` — port с connect/probe/disconnect; `PrismaDatabaseConnection` — PostgreSQL adapter. Prisma CLI, Client и adapter-pg закреплены на 7.10.0. Используется генератор prisma-client с CommonJS output, совместимый с NestJS build. `src/generated` и `dist` не коммитятся; Turbo build восстанавливает оба каталога из cache. `prisma generate` не требует URL и соединения с DB.

В схеме нет бизнес-моделей, таблиц и migrations. PostGIS создаётся официальным локальным Docker image; adapter проверяет расширение запросом SELECT PostGIS_Lib_Version(). ORM mapping spatial types, domain repositories, migrations и readiness endpoint — отдельные задачи.

Конфигурация требует явный DATABASE_URL с PostgreSQL protocol, host, database, username и password. URL options передаются драйверу без подмены; SSL certificate verification не отключается. Ошибки конфигурации/startup не включают URL или пароль. Pool ограничен пятью соединениями; connection и statement timeout — 5000 ms, idle timeout — 10000 ms. Shutdown вызывает Prisma $disconnect. Production SSL/pooling/reconnect/load behaviour пока не проверены.

Из корня: `pnpm --filter @truck/database build`, `pnpm test`, `pnpm test:database`. Последняя команда проверяет реальный adapter в отдельном одноразовом PostGIS container, включая неправильный пароль. Unit tests не подключаются к DB. Dev-only react-dom 19.2.3 удовлетворяет peer Prisma CLI Studio и совпадает с текущим React; Studio не запускается и в mobile runtime не используется.

Официальная документация для выбранной major version: [PostgreSQL adapter](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql), [client generator](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators). CLI latest на момент проверки указывал на Prisma 8 RC; обновление на RC не выполнялось.
