// VibeStream + Jamendo
// 1. Get a client_id at https://devportal.jamendo.com and paste it below.
const CLIENT_ID = "17af633d";
const API = "https://api.jamendo.com/v3.0";

const $ = (id) => document.getElementById(id);
const audio = $("audioPlayer");
const listEl = $("musicList");
const resultsText = $("resultsText");

let queue = [];
let current = -1;

// ---------- storage (favorites + recently played) ----------
const store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};
const slim = (t) => ({
  id: t.id, name: t.name, artist_name: t.artist_name,
  image: t.image, audio: t.audio, duration: t.duration,
  license_ccurl: t.license_ccurl || "",
});
const isFav = (id) => store.get("vs_favs").some((t) => t.id === id);

function toggleFav(track) {
  let favs = store.get("vs_favs");
  favs = isFav(track.id)
    ? favs.filter((t) => t.id !== track.id)
    : [slim(track), ...favs];
  store.set("vs_favs", favs);
}

function addRecent(track) {
  const recent = store.get("vs_recent").filter((t) => t.id !== track.id);
  store.set("vs_recent", [slim(track), ...recent].slice(0, 30));
}

// ---------- Jamendo ----------
async function fetchTracks(params = {}) {
  const query = new URLSearchParams({
    client_id: CLIENT_ID,
    format: "json",
    limit: 24,
    audioformat: "mp32",
    imagesize: 300,
    ...params,
  });
  const res = await fetch(`${API}/tracks/?${query}`);
  if (!res.ok) throw new Error(`Jamendo returned ${res.status}`);
  const data = await res.json();
  if (data.headers && data.headers.status !== "success") {
    throw new Error(data.headers.error_message || "Jamendo error");
  }
  return data.results.filter((t) => t.audio);
}

async function load(label, params) {
  resultsText.textContent = "Loading...";
  listEl.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading music...</p></div>';
  try {
    const tracks = await fetchTracks(params);
    render(tracks, label);
  } catch (err) {
    console.error(err);
    resultsText.textContent = "Could not load music";
    listEl.textContent = CLIENT_ID === "YOUR_CLIENT_ID"
      ? "Add your Jamendo client_id at the top of script.js."
      : "Request failed. Check your connection, your client_id, and the browser console.";
  }
}

// ---------- rendering ----------
function render(tracks, label) {
  queue = tracks;
  listEl.innerHTML = "";
  resultsText.textContent = tracks.length ? label : "Nothing here yet";
  tracks.forEach((track, i) => listEl.appendChild(card(track, i)));
}

function card(track, i) {
  const el = document.createElement("div");
  el.className = "music-card";
  el.style.cursor = "pointer";

  const img = document.createElement("img");
  img.src = track.image;
  img.alt = "";
  img.loading = "lazy";
  img.style.width = "100%";
  img.style.borderRadius = "8px";

  const title = document.createElement("h3");
  title.textContent = track.name;

  const artist = document.createElement("p");
  artist.textContent = track.artist_name;

  const heart = document.createElement("button");
  heart.type = "button";
  heart.title = "Favorite";
  heart.textContent = isFav(track.id) ? "❤️" : "🤍";
  heart.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFav(track);
    heart.textContent = isFav(track.id) ? "❤️" : "🤍";
  });

  el.append(img, title, artist, heart);
  el.addEventListener("click", () => playAt(i));
  return el;
}

// ---------- playback ----------
function playAt(i) {
  if (i < 0 || i >= queue.length) return;
  current = i;
  const t = queue[i];
  audio.src = t.audio;
  audio.play().catch((e) => console.error("Playback blocked:", e));

  $("currentTitle").textContent = t.name;
  $("currentArtist").textContent = t.artist_name;
  $("currentArtwork").src = t.image;
  addRecent(t);

  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.name,
      artist: t.artist_name,
      artwork: [{ src: t.image, sizes: "300x300" }],
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => playAt(current - 1));
    navigator.mediaSession.setActionHandler("nexttrack", () => playAt(current + 1));
  }
}

const fmt = (s) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

$("playButton").addEventListener("click", () => {
  if (!audio.src) { if (queue.length) playAt(0); return; }
  audio.paused ? audio.play() : audio.pause();
});
$("previousButton").addEventListener("click", () => playAt(current - 1));
$("nextButton").addEventListener("click", () => playAt(current + 1));

audio.addEventListener("play", () => ($("playButton").textContent = "⏸"));
audio.addEventListener("pause", () => ($("playButton").textContent = "▶"));
audio.addEventListener("ended", () => playAt(current + 1));
audio.addEventListener("loadedmetadata", () => {
  $("progressBar").max = Math.floor(audio.duration) || 100;
  $("duration").textContent = fmt(audio.duration);
});
audio.addEventListener("timeupdate", () => {
  $("progressBar").value = Math.floor(audio.currentTime);
  $("currentTime").textContent = fmt(audio.currentTime);
});
$("progressBar").addEventListener("input", (e) => (audio.currentTime = e.target.value));
$("volumeBar").addEventListener("input", (e) => (audio.volume = e.target.value));

// ---------- search + navigation ----------
function search() {
  const q = $("searchInput").value.trim();
  if (q) load(`Results for "${q}"`, { search: q });
}
$("searchBtn").addEventListener("click", search);
$("searchInput").addEventListener("keydown", (e) => { if (e.key === "Enter") search(); });

const views = {
  Home: () => load("Popular this month", { order: "popularity_month" }),
  Trending: () => load("Trending this week", { order: "popularity_week" }),
  Favorites: () => render(store.get("vs_favs"), "Your favorites"),
  "Favorite Songs": () => render(store.get("vs_favs"), "Your favorites"),
  "Recently Played": () => render(store.get("vs_recent"), "Recently played"),
  Playlists: () => {
    queue = [];
    listEl.textContent = "Playlists are coming soon.";
    resultsText.textContent = "Playlists";
  },
};

document.querySelectorAll(".menu-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".menu-item").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const name = btn.querySelector("span").textContent.trim();
    if (views[name]) views[name]();
  });
});

$("discoverBtn").addEventListener("click", () => {
  document.querySelector(".music-section").scrollIntoView({ behavior: "smooth" });
  views.Trending();
});

// ---------- remove Spotify UI ----------
["spotifyBtn", "spotifyStatus", "connectMainBtn"].forEach((id) => {
  const el = $(id);
  if (el) el.style.display = "none";
});

// ---------- start ----------
views.Home();
