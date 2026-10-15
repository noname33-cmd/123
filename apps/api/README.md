# API foundation

Команды запуска и проверки — в корневом README. NestJS 11, process liveness на `GET /health`, loopback listener. Нет подключения к DB/cache и нет бизнес-endpoints.

Unit test проверяет ответ контроллера, HTTP suite поднимает реальный Nest application и проверяет health/404. Dev использует TypeScript compiler с decorator metadata, чтобы будущая dependency injection совпадала с production build.
