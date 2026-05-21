# palatenco228 YouTube Hub

Красно-белый сайт для YouTube-канала: главный экран, статистика, последние видео, короткие ролики и ссылки.

## Запуск локально

```powershell
npm install
npm start
```

Открыть:

```text
http://localhost:3000
```

Если порт занят:

```powershell
$env:PORT="3001"
npm start
```

## YouTube API

API-ключ хранится только на Node.js сервере:

```powershell
$env:YOUTUBE_API_KEY="your_api_key"
$env:YOUTUBE_CHANNEL_HANDLE="@palatenco228"
npm start
```

Можно использовать channel id вместо handle:

```powershell
$env:YOUTUBE_CHANNEL_ID="UC..."
```

Серверные API:

- `/api/youtube/channel`
- `/api/youtube/videos?limit=10`

## Render backend + статический фронтенд

На Render загружается весь проект:

```text
public/
server.js
package.json
package-lock.json
README.md
```

Render settings:

```text
Environment: Node
Build command: npm install
Start command: npm start
```

Environment variables:

```text
YOUTUBE_API_KEY=your_api_key
YOUTUBE_CHANNEL_HANDLE=@palatenco228
CORS_ORIGIN=https://your-domain.ru
```

Если фронтенд лежит отдельно на Sprinthosting, залей содержимое папки `public` в `public_html`, а в `public/config.js` пропиши адрес Render:

```js
apiBaseUrl: "https://your-service.onrender.com",
```

Steam-ссылку можно добавить там же:

```js
steamUrl: "https://steamcommunity.com/id/your-profile",
```

Если фронтенд и backend живут вместе на Render, оставь:

```js
apiBaseUrl: "",
```
