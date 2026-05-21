const config = window.CHANNEL_CONFIG || {};
const API_BASE_URL = (config.apiBaseUrl || "").replace(/\/$/, "");

const mockChannel = {
  title: "palatenco228",
  description: "Красно-белый YouTube hub для свежих роликов, Shorts и будущих рубрик канала.",
  url: config.youtubeUrl,
  thumbnail: "",
  statistics: {
    subscriberCount: 2280,
    videoCount: 24,
    viewCount: 142800,
  },
};

const mockVideos = [
  {
    id: "demo-1",
    title: "Новый ролик канала",
    description: "Главный выпуск недели.",
    thumbnail: "",
    publishedAt: new Date().toISOString(),
    viewCount: 8200,
    likeCount: 640,
    duration: "PT8M12S",
    url: config.youtubeUrl,
  },
  {
    id: "demo-2",
    title: "Лучшие моменты",
    description: "Нарезка самых ярких сцен.",
    thumbnail: "",
    publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    viewCount: 6100,
    likeCount: 480,
    duration: "PT5M44S",
    url: config.youtubeUrl,
  },
  {
    id: "demo-3",
    title: "Реакция на тренд",
    description: "Коротко, громко, по делу.",
    thumbnail: "",
    publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    viewCount: 4500,
    likeCount: 390,
    duration: "PT3M21S",
    url: config.youtubeUrl,
  },
  {
    id: "demo-4",
    title: "Выпуск для своих",
    description: "То, что зрители просили давно.",
    thumbnail: "",
    publishedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    viewCount: 3300,
    likeCount: 260,
    duration: "PT11M09S",
    url: config.youtubeUrl,
  },
  {
    id: "demo-short-1",
    title: "Shorts: момент дня",
    description: "Быстрый клип.",
    thumbnail: "",
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    viewCount: 12100,
    likeCount: 940,
    duration: "PT41S",
    url: config.youtubeUrl,
  },
  {
    id: "demo-short-2",
    title: "Shorts: реакция",
    description: "Короткий формат.",
    thumbnail: "",
    publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    viewCount: 9900,
    likeCount: 710,
    duration: "PT55S",
    url: config.youtubeUrl,
  },
];

const formatNumber = (value) =>
  new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);

const formatDate = (value) =>
  new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

function parseDurationSeconds(duration) {
  const match = String(duration || "").match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

function formatDuration(duration) {
  const total = parseDurationSeconds(duration);
  if (!total) return "";
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fallbackThumb(index) {
  return `
    <div class="thumb fallback-thumb">
      <span>${String(index + 1).padStart(2, "0")}</span>
    </div>
  `;
}

function renderThumb(video, index) {
  if (!video.thumbnail) return fallbackThumb(index);
  return `<div class="thumb" style="background-image:url('${escapeHtml(video.thumbnail)}')"></div>`;
}

function renderVideoCard(video, index) {
  return `
    <article class="media-card">
      <a href="${escapeHtml(video.url || config.youtubeUrl)}" target="_blank" rel="noreferrer">
        ${renderThumb(video, index)}
        <div class="media-body">
          <div class="media-kicker">
            <span>${video.publishedAt ? formatDate(video.publishedAt) : "YouTube"}</span>
            <span>${formatDuration(video.duration)}</span>
          </div>
          <h3>${escapeHtml(video.title)}</h3>
          <p>${escapeHtml(video.description || "Смотреть на YouTube")}</p>
          <div class="meta-row">
            <span>${formatNumber(video.viewCount)} просмотров</span>
            <span>${formatNumber(video.likeCount)} лайков</span>
          </div>
        </div>
      </a>
    </article>
  `;
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function setLink(selector, url) {
  const element = document.querySelector(selector);
  if (!element) return;

  element.href = url || "#";
  if (!url || url === "#") {
    element.setAttribute("aria-disabled", "true");
    element.addEventListener("click", (event) => event.preventDefault());
  }
}

function renderChannel(channel, fromApi) {
  const title = channel.title || "palatenco228";
  const description = channel.description || mockChannel.description;
  const url = config.youtubeUrl || channel.url;

  setText("#channelTitle", title);
  setText("#cardTitle", title);
  setText("#channelDescription", description);
  setText("#subscriberCount", formatNumber(channel.statistics?.subscriberCount));
  setText("#videoCount", formatNumber(channel.statistics?.videoCount));
  setText("#viewCount", formatNumber(channel.statistics?.viewCount));
  setText("#apiStatus", fromApi ? "Данные подключены через YouTube API" : "Пока показываем демо-данные");
  setLink("#youtubeButton", url);
  setLink("#youtubeTile", url);
  setLink("#telegramTile", config.telegramUrl);

  const avatar = document.querySelector("#avatar");
  if (!avatar) return;

  if (channel.thumbnail) {
    avatar.textContent = "";
    avatar.style.backgroundImage = `url('${channel.thumbnail.replaceAll("'", "%27")}')`;
    avatar.classList.add("has-image");
  } else {
    avatar.textContent = title.trim().charAt(0).toUpperCase() || "P";
  }
}

function renderVideos(videos) {
  const normalized = videos.length ? videos : mockVideos;
  const shorts = normalized.filter((video) => parseDurationSeconds(video.duration) > 0 && parseDurationSeconds(video.duration) <= 60);
  const mainVideos = normalized.filter((video) => parseDurationSeconds(video.duration) > 60);

  document.querySelector("#videosGrid").innerHTML = (mainVideos.length ? mainVideos : normalized.slice(0, 4))
    .slice(0, 6)
    .map(renderVideoCard)
    .join("");

  document.querySelector("#shortsGrid").innerHTML = (shorts.length ? shorts : normalized.slice(-3))
    .slice(0, 4)
    .map(renderVideoCard)
    .join("");
}

async function getJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

async function loadData() {
  try {
    const [channel, videos] = await Promise.all([
      getJson("/api/youtube/channel"),
      getJson("/api/youtube/videos?limit=10"),
    ]);
    renderChannel(channel, true);
    renderVideos(videos);
  } catch (error) {
    renderChannel(mockChannel, false);
    renderVideos(mockVideos);
  }
}

renderChannel(mockChannel, false);
renderVideos(mockVideos);
loadData();
