const http = require("http");
const https = require("https");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");

loadEnvFile(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";
const YOUTUBE_CHANNEL_HANDLE = process.env.YOUTUBE_CHANNEL_HANDLE || "@palatenco228";
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

let channelCache = null;
let videosCache = null;

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

function loadEnvFile(filePath) {
  if (!fsSync.existsSync(filePath)) return;

  const lines = fsSync.readFileSync(filePath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separator = trimmed.indexOf("=");
    if (separator === -1) return;

    const key = trimmed.slice(0, separator).trim().replace(/^\uFEFF/, "");
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": CORS_ORIGIN,
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization",
  };
}

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...corsHeaders(),
  });
  res.end(JSON.stringify(payload));
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const target = typeof url === "string" ? new URL(url) : url;
    const request = https.request(target, { method: "GET" }, (response) => {
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
          const message =
            body.error?.message ||
            body.error?.errors?.[0]?.reason ||
            body.error?.status ||
            `Request to ${target.hostname} failed with ${response.statusCode}`;
          reject(new Error(message));
          return;
        }

        resolve(body);
      });
    });

    request.on("error", reject);
    request.end();
  });
}

function requireApiKey() {
  if (!YOUTUBE_API_KEY) {
    const error = new Error("YOUTUBE_API_KEY is not configured");
    error.statusCode = 503;
    throw error;
  }
}

async function youtubeRequest(endpoint, params = {}) {
  requireApiKey();
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  Object.entries({ ...params, key: YOUTUBE_API_KEY }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return requestJson(url);
}

function bestThumbnail(thumbnails = {}) {
  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    ""
  );
}

function channelUrl(channel) {
  if (channel?.snippet?.customUrl) return `https://www.youtube.com/${channel.snippet.customUrl}`;
  if (YOUTUBE_CHANNEL_HANDLE) return `https://www.youtube.com/${YOUTUBE_CHANNEL_HANDLE}`;
  return `https://www.youtube.com/channel/${channel.id}`;
}

async function getChannel() {
  if (channelCache && channelCache.expiresAt > Date.now()) {
    return channelCache.value;
  }

  const params = {
    part: "snippet,statistics,contentDetails",
  };

  if (YOUTUBE_CHANNEL_ID) {
    params.id = YOUTUBE_CHANNEL_ID;
  } else {
    params.forHandle = YOUTUBE_CHANNEL_HANDLE;
  }

  const response = await youtubeRequest("channels", params);
  const channel = response.items?.[0];
  if (!channel) throw new Error("YouTube channel was not found");

  const normalized = {
    id: channel.id,
    title: channel.snippet?.title || "YouTube channel",
    description: channel.snippet?.description || "",
    thumbnail: bestThumbnail(channel.snippet?.thumbnails),
    url: channelUrl(channel),
    uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads || "",
    statistics: {
      subscriberCount: Number(channel.statistics?.subscriberCount || 0),
      videoCount: Number(channel.statistics?.videoCount || 0),
      viewCount: Number(channel.statistics?.viewCount || 0),
    },
  };

  channelCache = {
    value: normalized,
    expiresAt: Date.now() + 1000 * 60 * 10,
  };
  return normalized;
}

async function getVideos(limit = 10) {
  if (videosCache && videosCache.expiresAt > Date.now() && videosCache.limit >= limit) {
    return videosCache.value.slice(0, limit);
  }

  const channel = await getChannel();
  if (!channel.uploadsPlaylistId) return [];

  const playlistItems = await youtubeRequest("playlistItems", {
    part: "snippet,contentDetails",
    playlistId: channel.uploadsPlaylistId,
    maxResults: Math.min(Math.max(limit, 1), 20),
  });

  const videoIds = (playlistItems.items || [])
    .map((item) => item.contentDetails?.videoId)
    .filter(Boolean);

  if (!videoIds.length) return [];

  const details = await youtubeRequest("videos", {
    part: "snippet,statistics,contentDetails",
    id: videoIds.join(","),
    maxResults: videoIds.length,
  });

  const videos = (details.items || []).map((video) => ({
    id: video.id,
    title: video.snippet?.title || "YouTube video",
    description: video.snippet?.description || "",
    thumbnail: bestThumbnail(video.snippet?.thumbnails),
    publishedAt: video.snippet?.publishedAt || "",
    viewCount: Number(video.statistics?.viewCount || 0),
    likeCount: Number(video.statistics?.likeCount || 0),
    duration: video.contentDetails?.duration || "",
    url: `https://www.youtube.com/watch?v=${video.id}`,
  }));

  videosCache = {
    value: videos,
    limit,
    expiresAt: Date.now() + 1000 * 60 * 5,
  };
  return videos;
}

async function handleYoutubeApi(req, res, url) {
  try {
    if (url.pathname === "/api/youtube/channel") {
      return json(res, 200, await getChannel());
    }

    if (url.pathname === "/api/youtube/videos") {
      const limit = Math.min(Number(url.searchParams.get("limit") || 10), 20);
      return json(res, 200, await getVideos(limit));
    }

    return json(res, 404, { error: "Unknown API route" });
  } catch (error) {
    return json(res, error.statusCode || 500, {
      error: error.message,
      hint: "Set YOUTUBE_API_KEY and YOUTUBE_CHANNEL_HANDLE or YOUTUBE_CHANNEL_ID on the server.",
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

  if (url.pathname.startsWith("/api/youtube/")) {
    await handleYoutubeApi(req, res, url);
    return;
  }

  await serveStatic(req, res, url);
});

server.listen(PORT, HOST, () => {
  console.log(`palatenco228 YouTube hub: http://${HOST}:${PORT}`);
});
