# palatenco228 Twitch Hub

Mini site for Twitch channel `palatenco228`: hero section, clips, stream archives, Twitch/YouTube links, and optional Twitch Helix API proxy.

## Local Run

```powershell
npm install
npm start
```

Open:

```text
http://localhost:3000
```

If port `3000` is busy:

```powershell
$env:PORT="3001"
npm start
```

## Twitch API

Keep `TWITCH_CLIENT_SECRET` only on the Node.js server. Do not put it into frontend files.

```powershell
$env:TWITCH_LOGIN="palatenco228"
$env:TWITCH_CLIENT_ID="your_client_id"
$env:TWITCH_CLIENT_SECRET="your_client_secret"
npm start
```

The server uses Twitch Helix:

- `/helix/users` to get `broadcaster_id`
- `/helix/streams` for live status
- `/helix/clips` for clips
- `/helix/videos` for stream archives

## Render Backend + Sprinthosting Frontend

Deploy the full project to Render as a Web Service:

- Environment: `Node`
- Build command: `npm install`
- Start command: `npm start`

Add Render environment variables:

```text
TWITCH_LOGIN=palatenco228
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
CORS_ORIGIN=https://your-domain.ru
```

Render will provide a URL like:

```text
https://your-service.onrender.com
```

For Sprinthosting static frontend, upload only the `public` folder contents to `public_html`.

Before uploading, edit `public/config.js`:

```js
window.CHANNEL_CONFIG = {
  twitchLogin: "palatenco228",
  twitchUrl: "https://www.twitch.tv/palatenco228",
  youtubeUrl: "#",
  apiBaseUrl: "https://your-service.onrender.com",
};
```

If frontend and backend are on the same Render service, leave `apiBaseUrl` empty.

## YouTube

When the YouTube channel is ready, replace `youtubeUrl` in `public/config.js`.
