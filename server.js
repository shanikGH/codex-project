const http = require("http");
const https = require("https");
const fs = require("fs").promises;
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const TWITCH_LOGIN = process.env.TWITCH_LOGIN || "palatenco228";
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || "";
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || "";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

let tokenCache = null;
let userCache = null;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...corsHeaders(),
  });
  res.end(JSON.stringify(payload));
}

function corsHeaders() {
  return {
    "access-control-allow-origin": CORS_ORIGIN,
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization",
  };
}

function hasTwitchCredentials() {
  return Boolean(TWITCH_CLIENT_ID && TWITCH_CLIENT_SECRET);
}

async function getAppToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) {
    return tokenCache.value;
  }

  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    client_secret: TWITCH_CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const body = await requestJson(`https://id.twitch.tv/oauth2/token?${params.toString()}`, {
    method: "POST",
  });
  tokenCache = {
    value: body.access_token,
    expiresAt: Date.now() + Number(body.expires_in || 3600) * 1000,
  };
  return tokenCache.value;
}

async function twitchRequest(endpoint, query = {}) {
  if (!hasTwitchCredentials()) {
    const error = new Error("Twitch credentials are not configured");
    error.statusCode = 503;
    throw error;
  }

  const token = await getAppToken();
  const url = new URL(`https://api.twitch.tv/helix/${endpoint}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return requestJson(url, {
    headers: {
      "Client-Id": TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token}`,
    },
  });
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const target = typeof url === "string" ? new URL(url) : url;
    const request = https.request(
      target,
      {
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (response) => {
        let data = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          let body = {};

          try {
            body = data ? JSON.parse(data) : {};
          } catch (error) {
            reject(new Error(`Invalid JSON response from ${target.hostname}`));
            return;
          }

          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`Request to ${target.hostname} failed with ${response.statusCode}`));
            return;
          }

          resolve(body);
        });
      },
    );

    request.on("error", reject);
    request.end(options.body || undefined);
  });
}

async function getChannelUser() {
  if (userCache) return userCache;
  const users = await twitchRequest("users", { login: TWITCH_LOGIN });
  const user = users.data?.[0];
  if (!user) throw new Error(`Twitch user ${TWITCH_LOGIN} was not found`);
  userCache = user;
  return user;
}

async function handleTwitchApi(req, res, url) {
  try {
    if (url.pathname === "/api/twitch/summary") {
      const user = await getChannelUser();
      const streams = await twitchRequest("streams", { user_login: TWITCH_LOGIN });
      const live = streams.data?.[0] || null;
      return json(res, 200, {
        id: user.id,
        login: user.login,
        displayName: user.display_name,
        profileImage: user.profile_image_url,
        isLive: Boolean(live),
        title: live?.title || "",
        gameName: live?.game_name || "",
        viewerCount: live?.viewer_count || 0,
      });
    }

    if (url.pathname === "/api/twitch/clips") {
      const user = await getChannelUser();
      const limit = Math.min(Number(url.searchParams.get("limit") || 6), 20);
      const startedAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString();
      const clips = await twitchRequest("clips", {
        broadcaster_id: user.id,
        first: limit,
        started_at: startedAt,
      });
      return json(res, 200, clips.data || []);
    }

    if (url.pathname === "/api/twitch/videos") {
      const user = await getChannelUser();
      const limit = Math.min(Number(url.searchParams.get("limit") || 4), 20);
      const videos = await twitchRequest("videos", {
        user_id: user.id,
        first: limit,
        type: "archive",
      });
      return json(res, 200, videos.data || []);
    }

    return json(res, 404, { error: "Unknown API route" });
  } catch (error) {
    return json(res, error.statusCode || 500, {
      error: error.message,
      hint: "Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET to enable live Twitch API data.",
    });
  }
}

async function serveStatic(req, res, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": contentTypes[ext] || "application/octet-stream",
      "cache-control": "no-cache",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (url.pathname.startsWith("/api/twitch/")) {
    await handleTwitchApi(req, res, url);
    return;
  }

  await serveStatic(req, res, url);
});

server.listen(PORT, HOST, () => {
  console.log(`palatenco228 site: http://${HOST}:${PORT}`);
});
