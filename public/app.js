const config = window.CHANNEL_CONFIG ?? {};
const API_BASE_URL = (config.apiBaseUrl || "").replace(/\/$/, "");

const mockClips = [
  {
    title: "Лучший момент стрима",
    creator_name: "chat",
    view_count: 1280,
    duration: 31,
    url: config.twitchUrl,
    thumbnail_url: "",
  },
  {
    title: "Реакция, которую надо пересмотреть",
    creator_name: "viewer",
    view_count: 940,
    duration: 24,
    url: config.twitchUrl,
    thumbnail_url: "",
  },
  {
    title: "Жесткий камбек",
    creator_name: "palatenco228",
    view_count: 770,
    duration: 42,
    url: config.twitchUrl,
    thumbnail_url: "",
  },
  {
    title: "Чат не ожидал",
    creator_name: "community",
    view_count: 610,
    duration: 18,
    url: config.twitchUrl,
    thumbnail_url: "",
  },
  {
    title: "Минутка хаоса",
    creator_name: "chat",
    view_count: 520,
    duration: 29,
    url: config.twitchUrl,
    thumbnail_url: "",
  },
  {
    title: "Финал катки",
    creator_name: "viewer",
    view_count: 430,
    duration: 36,
    url: config.twitchUrl,
    thumbnail_url: "",
  },
];

const mockStreams = [
  {
    title: "Последний стрим",
    view_count: 2100,
    duration: "2h 14m",
    created_at: new Date().toISOString(),
    url: config.twitchUrl,
    thumbnail_url: "",
  },
  {
    title: "Вечерний эфир",
    view_count: 1740,
    duration: "1h 58m",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    url: config.twitchUrl,
    thumbnail_url: "",
  },
  {
    title: "Лучшие моменты недели",
    view_count: 1320,
    duration: "3h 05m",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    url: config.twitchUrl,
    thumbnail_url: "",
  },
  {
    title: "Ночной стрим",
    view_count: 980,
    duration: "2h 47m",
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    url: config.twitchUrl,
    thumbnail_url: "",
  },
];

const formatNumber = (value) =>
  new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);

const formatDate = (value) =>
  new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

const normalizeThumb = (url) => {
  if (!url) return "";
  return url.replace("%{width}", "640").replace("%{height}", "360");
};

const fallbackMedia = (label) => `
  <div class="thumb fallback-thumb">
    <span>${label}</span>
  </div>
`;

function mediaThumb(item, label) {
  const thumb = normalizeThumb(item.thumbnail_url);
  if (!thumb) return fallbackMedia(label);

  return `
    <div class="thumb" style="background-image: url('${thumb.replaceAll("'", "%27")}')"></div>
  `;
}

function renderClips(clips) {
  const grid = document.querySelector("#clipsGrid");
  grid.innerHTML = clips
    .map(
      (clip, index) => `
        <article class="media-card">
          <a href="${clip.url || config.twitchUrl}" target="_blank" rel="noreferrer" aria-label="Открыть клип: ${clip.title}">
            ${mediaThumb(clip, `Clip ${index + 1}`)}
            <div class="media-body">
              <h3>${clip.title}</h3>
              <p>Автор: ${clip.creator_name || "viewer"}</p>
              <div class="meta-row">
                <span>${formatNumber(clip.view_count)} просмотров</span>
                <span>${Math.round(clip.duration || 0)} сек</span>
              </div>
            </div>
          </a>
        </article>
      `,
    )
    .join("");
  document.querySelector("#clipCount").textContent = clips.length;
}

function renderStreams(streams) {
  const grid = document.querySelector("#streamsGrid");
  grid.innerHTML = streams
    .map(
      (stream, index) => `
        <article class="media-card">
          <a href="${stream.url || config.twitchUrl}" target="_blank" rel="noreferrer" aria-label="Открыть стрим: ${stream.title}">
            ${mediaThumb(stream, `VOD ${index + 1}`)}
            <div class="media-body">
              <h3>${stream.title}</h3>
              <p>${stream.created_at ? formatDate(stream.created_at) : "Архив Twitch"}</p>
              <div class="meta-row">
                <span>${formatNumber(stream.view_count)} просмотров</span>
                <span>${stream.duration || "VOD"}</span>
              </div>
            </div>
          </a>
        </article>
      `,
    )
    .join("");
  document.querySelector("#vodCount").textContent = streams.length;
}

function renderStatus(summary) {
  const status = document.querySelector("#liveStatus");

  if (summary?.isLive) {
    status.className = "live-status is-live";
    status.textContent = `Сейчас онлайн: ${summary.title || "стрим идет"}`;
    return;
  }

  status.className = "live-status";
  status.textContent = "Сейчас офлайн, но клипы уже на месте";
}

async function getJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

async function loadTwitchData() {
  const [summaryResult, clipsResult, streamsResult] = await Promise.allSettled([
    getJson("/api/twitch/summary"),
    getJson("/api/twitch/clips?limit=6"),
    getJson("/api/twitch/videos?limit=4"),
  ]);

  renderStatus(summaryResult.status === "fulfilled" ? summaryResult.value : null);
  renderClips(clipsResult.status === "fulfilled" && clipsResult.value.length ? clipsResult.value : mockClips);
  renderStreams(streamsResult.status === "fulfilled" && streamsResult.value.length ? streamsResult.value : mockStreams);
}

function initLinks() {
  const youtube = document.querySelector("#youtubeLink");
  youtube.href = config.youtubeUrl || "#";

  if (!config.youtubeUrl || config.youtubeUrl === "#") {
    youtube.setAttribute("aria-disabled", "true");
    youtube.addEventListener("click", (event) => event.preventDefault());
  }
}

initLinks();
loadTwitchData();
