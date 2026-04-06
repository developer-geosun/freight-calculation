# Google Apps Script Backend

Папка містить backend-частину для збереження заявок маршруту у Google Sheets.

## Що зберігається

Створюються/використовуються 2 листи:

- `requests` — заголовок заявки
- `request_points` — точки маршруту

## Структура payload (з фронтенду)

```json
{
  "clientRequestId": "REQ123",
  "timestamp": "2026-04-06T09:00:00.000Z",
  "source": "freight-calculation-web",
  "userAgent": "Mozilla/5.0 ...",
  "lang": "ru",
  "email": "user@example.com",
  "phone": "+380501112233",
  "preferredStartDate": "2026-04-10",
  "routeComment": "Комментарий",
  "distanceKm": 1234.567,
  "route": "1. A -> 2. B",
  "points": [
    {
      "order": 1,
      "type": "start",
      "address": "Kyiv, UA",
      "lat": 50.45,
      "lng": 30.52,
      "country": "ua",
      "isBorder": false,
      "segmentDistanceKmToNext": 220.5
    }
  ]
}
```

## Як розгорнути

1. Створіть Google Sheet.
2. Відкрийте `Extensions -> Apps Script`.
3. Вставте вміст `Code.gs` і `appsscript.json`.
4. `Deploy -> New deployment -> Web app`.
5. Доступ: `Anyone`.
6. Скопіюйте URL і вставте в `js/config.js` у змінну `WEB_APP_URL`.
