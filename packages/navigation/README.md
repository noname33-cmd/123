# Navigation boundary

`NavigationEngine.getAvailability()` — наш внутренний capability contract, не метод HERE SDK. `UnavailableNavigationEngine` всегда возвращает `available: false` с причиной `provider-not-configured`.

Контракт используется shell и проверяется unit/component tests. Методы truck routing и GPS появятся только после проверки официального SDK, лицензии и bridge compatibility. Заглушка не возвращает маршрутов.

Из корня: `pnpm --filter @truck/navigation build`, затем `pnpm --filter @truck/navigation test`.
