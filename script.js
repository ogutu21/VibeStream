
// VibeStream v2 — Jamendo, genres, playlists, queue, shuffle & repeat
const CLIENT_ID = "17af633d";
const API = "https://api.jamendo.com/v3.0";

const $ = (id) => document.getElementById(id);
const audio = $("audioPlayer");
const listEl = $("musicList");
const resultsText = $("resultsText");

let queue = [];      // tracks currently shown on screen
let playQueue = [];  // tracks actually being played (snapshot)
let current = -1;
let shuffleOn = false;
let repeatMode = "off"; // off | all | one

// ---------- injected styles for new UI (kept separate from style.css) ----------
const css = document.createElement("style");
css.textContent = `
.vs-chips{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 22px}
.vs-chip{padding:7px 15px;border-radius:24px;border:1px solid var(--border);background:var(--card);color:var(--muted);cursor:pointer;font-size:13px;transition:.2s ease}
.vs-chip:hover{background:var(--card-hover);color:var(--text)}
.vs-chip.active{background:var(--green);border-color:var(--green);color:#000;font-weight:bold}
.card-actions{display:flex;gap:2px;align-items:center}
.card-actions button{background:transparent;border:none;color:#777;cursor:pointer;font-size:17px;padding:4px 6px}
.card-actions button:hover{color:var(--text)}
.card-actions .favorite-button.on{color:var(--danger)}
.player-buttons .vs-toggle{opacity:.5;font-size:15px}
.player-buttons .vs-toggle.on{opacity:1;color:var(--green)}
.vs-panel{position:fixed;right:20px;bottom:108px;width:min(340px,calc(100vw - 40px));max-height:50vh;overflow:auto;background:var(--background-light);border:1px solid var(--border);border-radius:10px;padding:12px;z-index:1900;display:none;box-shadow:0 10px 30px rgba(0,0,0,.6)}
.vs-panel.open{display:block}
.vs-panel h4{font-size:11px;letter-spacing:1.5px;color:#666;margin:0 0 8px}
.vs-panel p{color:var(--muted);font-size:13px}
.vs-q-item{display:block;width:100%;text-align:left;background:transparent;border:0;color:#ccc;padding:9px;border-radius:6px;cursor:pointer;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vs-q-item:hover{background:var(--card-hover);color:var(--text)}
.vs-q-item.now{color:var(--green);background:#1d1d1d}
.vs-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:3000}
.vs-modal{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;width:min(340px,90vw);max-height:70vh;overflow:auto}
.vs-modal h3{margin:0 0 12px;font-size:16px}
.vs-modal button{display:block;width:100%;text-align:left;margin:6px 0;padding:11px 12px;border-radius:8px;border:1px solid var(--border);background:var(--background-light);color:var(--text);cursor:pointer;font-size:14px;transition:.2s ease}
.vs-modal button:hover{background:var(--card-hover);border-color:var(--green)}
.vs-row{grid-column:1/-1;display:flex;align-items:center;gap:10px;padding:14px;background:var(--card);border:1px solid var(--border);border-radius:10px}
.vs-row span{flex:1;font-size:14px}
.vs-row button,.vs-wide button{background:transparent;border:1px solid #333;color:var(--text);border-radius:24px;padding:8px 16px;cursor:pointer;font-size:13px;transition:.2s ease}
.vs-row button:hover,.vs-wide button:hover{border-color:var(--green);color:var(--green)}
.vs-wide{grid-column:1/-1}
@media(max-width:600px){.vs-panel{bottom:135px}}
`;
document.head.appendChild(css);

// ---------- storage ----------
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

// favorites
const isFav = (id) => store.get("vs_favs").some((t) => t.id === id);
function toggleFav(track) {
  const favs = store.get("vs_favs");
  store.set("vs_favs", isFav(track.id)
    ? favs.filter((t) => t.id !== track.id)
    : [slim(track), ...favs]);
}

// recently played
function addRecent(track) {
  const recent = store.get("vs_recent").filter((t) => t.id !== track.id);
  store.set("vs_recent", [slim(track), ...recent].slice(0, 30));
}

// playlists
const getPls = () => store.get("vs_playlists");
const savePls = (p) => store.set("vs_playlists", p);
function createPlaylist(name) {
  const pls = getPls();
  const pl = { id: Date.now().toString(36), name, tracks: [] };
  pls.push(pl);
  savePls(pls);
  return pl;
}
function addToPlaylist(plId, track) {
  const pls = getPls();
  const pl = pls.find((p) => p.id === plId);
  if (pl && !pl.tracks.some((t) => t.id === track.id)) {
    pl.tracks.push(slim(track));
    savePls(pls);
  }
}
function removeFromPlaylist(plId, trackId) {
  const pls = getPls();
  const pl = pls.find((p) => p.id === plId);
  if (pl) {
    pl.tracks = pl.tracks.filter((t) => t.id !== trackId);
    savePls(pls);
  }
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
    render(await fetchTracks(params), label);
  } catch (err) {
    console.error(err);
    resultsText.textContent = "Could not load music";
    listEl.innerHTML = "";
    const box = document.createElement("div");
    box.className = "error-message";
    box.textContent = "Couldn't load music. Check your connection and the browser console.";
    listEl.appendChild(box);
  }
}

// ---------- rendering ----------
function button(text, onClick, title) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  if (title) b.title = title;
  b.addEventListener("click", (e) => { e.stopPropagation(); onClick(b); });
  return b;
}

function emptyMsg(title, text) {
  const d = document.createElement("div");
  d.className = "empty-message";
  const h = document.createElement("h3");
  h.textContent = title;
  const p = document.createElement("p");
  p.textContent = text;
  d.append(h, p);
  return d;
}

function render(tracks, label, ctx = {}) {
  queue = tracks;
  listEl.innerHTML = "";
  resultsText.textContent = tracks.length ? label : "Nothing here yet";

  if (ctx.playlistId) {
    const back = document.createElement("div");
    back.className = "vs-wide";
    back.appendChild(button("← All playlists", showPlaylists));
    listEl.appendChild(back);
  }
  if (!tracks.length) {
    listEl.appendChild(emptyMsg("Nothing here yet", "Songs you favorite, play, or add will show up here."));
  }
  tracks.forEach((t, i) => listEl.appendChild(card(t, i, ctx)));
}

function card(track, i, ctx) {
  const el = document.createElement("div");
  el.className = "music-card";

  const img = document.createElement("img");
  img.className = "music-image";
  img.src = track.image;
  img.alt = "";
  img.loading = "lazy";

  const title = document.createElement("h3");
  title.textContent = track.name;
  const artist = document.createElement("p");
  artist.textContent = track.artist_name;

  const bottom = document.createElement("div");
  bottom.className = "card-bottom";

  const play = button("▶", () => startFrom(i), "Play");
  play.className = "play-card";

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const fav = button(isFav(track.id) ? "♥" : "♡", () => {
    toggleFav(track);
    fav.textContent = isFav(track.id) ? "♥" : "♡";
    fav.classList.toggle("on", isFav(track.id));
  }, "Favorite");
  fav.className = "favorite-button" + (isFav(track.id) ? " on" : "");
  actions.appendChild(fav);
  actions.appendChild(button("＋", () => pickPlaylist(track), "Add to playlist or queue"));
  if (ctx.playlistId) {
    actions.appendChild(button("✕", () => {
      removeFromPlaylist(ctx.playlistId, track.id);
      openPlaylist(ctx.playlistId);
    }, "Remove from playlist"));
  }

  bottom.append(play, actions);
  el.append(img, title, artist, bottom);
  el.addEventListener("click", () => startFrom(i));
  return el;
}

// ---------- playlists UI ----------
function pickPlaylist(track) {
  const overlay = document.createElement("div");
  overlay.className = "vs-overlay";
  const modal = document.createElement("div");
  modal.className = "vs-modal";
  const h = document.createElement("h3");
  h.textContent = "Add to playlist";
  modal.appendChild(h);
  const close = () => overlay.remove();

  modal.appendChild(button("⏭ Play next", () => {
    if (!playQueue.length) { playQueue = [track]; playIndex(0); }
    else { playQueue.splice(current + 1, 0, track); renderQueuePanel(); }
    close();
  }));

  getPls().forEach((pl) => {
    modal.appendChild(button(`${pl.name} (${pl.tracks.length})`, () => {
      addToPlaylist(pl.id, track);
      close();
    }));
  });
  modal.appendChild(button("＋ New playlist", () => {
    const name = (prompt("Playlist name") || "").trim();
    if (name) addToPlaylist(createPlaylist(name).id, track);
    close();
  }));
  modal.appendChild(button("Cancel", close));
  overlay.appendChild(modal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);
}

function showPlaylists() {
  queue = [];
  resultsText.textContent = "Your playlists";
  listEl.innerHTML = "";

  const top = document.createElement("div");
  top.className = "vs-wide";
  top.appendChild(button("＋ New playlist", () => {
    const name = (prompt("Playlist name") || "").trim();
    if (name) { createPlaylist(name); showPlaylists(); }
  }));
  listEl.appendChild(top);

  const pls = getPls();
  if (!pls.length) {
    listEl.appendChild(emptyMsg("No playlists yet", "Create one, then use ＋ on any song to add it."));
  }
  pls.forEach((pl) => {
    const row = document.createElement("div");
    row.className = "vs-row";
    const name = document.createElement("span");
    name.textContent = `${pl.name} · ${pl.tracks.length} songs`;
    row.append(
      name,
      button("Open", () => openPlaylist(pl.id)),
      button("Delete", () => {
        if (confirm(`Delete "${pl.name}"?`)) {
          savePls(getPls().filter((p) => p.id !== pl.id));
          showPlaylists();
        }
      })
    );
    listEl.appendChild(row);
  });
}

function openPlaylist(id) {
  const pl = getPls().find((p) => p.id === id);
  if (!pl) return showPlaylists();
  render(pl.tracks, pl.name, { playlistId: id });
}

// ---------- playback ----------
function startFrom(i) {
  playQueue = queue.slice();
  playIndex(i);
}

function playIndex(i) {
  if (i < 0 || i >= playQueue.length) return;
  current = i;
  const t = playQueue[i];
  audio.src = t.audio;
  audio.play().catch((e) => console.error("Playback blocked:", e));

  $("currentTitle").textContent = t.name;
  $("currentArtist").textContent = t.artist_name;
  $("currentArtwork").src = t.image;
  addRecent(t);
  renderQueuePanel();

  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.name,
      artist: t.artist_name,
      artwork: [{ src: t.image, sizes: "300x300" }],
    });
    navigator.mediaSession.setActionHandler("previoustrack", prev);
    navigator.mediaSession.setActionHandler("nexttrack", () => next(false));
  }
}

function next(auto) {
  if (!playQueue.length) return;
  if (auto && repeatMode === "one") { audio.currentTime = 0; audio.play(); return; }
  if (shuffleOn && playQueue.length > 1) {
    let n;
    do { n = Math.floor(Math.random() * playQueue.length); } while (n === current);
    return playIndex(n);
  }
  if (current + 1 < playQueue.length) return playIndex(current + 1);
  if (repeatMode === "all") return playIndex(0);
}

function prev() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  if (current > 0) playIndex(current - 1);
  else if (repeatMode === "all") playIndex(playQueue.length - 1);
}

const fmt = (s) => {
  if (!isFinite(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

$("playButton").addEventListener("click", () => {
  if (!audio.src) { if (queue.length) startFrom(0); return; }
  audio.paused ? audio.play() : audio.pause();
});
$("previousButton").addEventListener("click", prev);
$("nextButton").addEventListener("click", () => next(false));

audio.addEventListener("play", () => ($("playButton").textContent = "⏸"));
audio.addEventListener("pause", () => ($("playButton").textContent = "▶"));
audio.addEventListener("ended", () => next(true));
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

// ---------- shuffle, repeat, queue panel ----------
const shuffleBtn = button("🔀", () => {
  shuffleOn = !shuffleOn;
  shuffleBtn.classList.toggle("on", shuffleOn);
}, "Shuffle");
shuffleBtn.className = "vs-toggle";

const repeatBtn = button("🔁", () => {
  repeatMode = repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
  repeatBtn.textContent = repeatMode === "one" ? "🔂" : "🔁";
  repeatBtn.classList.toggle("on", repeatMode !== "off");
  repeatBtn.title = `Repeat: ${repeatMode}`;
}, "Repeat: off");
repeatBtn.className = "vs-toggle";

const buttons = document.querySelector(".player-buttons");
buttons.prepend(shuffleBtn);
buttons.append(repeatBtn);

const panel = document.createElement("div");
panel.className = "vs-panel";
document.body.appendChild(panel);

const queueBtn = button("☰", () => {
  queueBtn.classList.toggle("on", panel.classList.toggle("open"));
}, "Up next");
queueBtn.className = "vs-toggle";
buttons.append(queueBtn);

function renderQueuePanel() {
  panel.innerHTML = "";
  const h = document.createElement("h4");
  h.textContent = "Up next";
  panel.appendChild(h);
  if (!playQueue.length) {
    const p = document.createElement("p");
    p.textContent = "Play a song to build your queue.";
    panel.appendChild(p);
    return;
  }
  playQueue.forEach((t, i) => {
    const b = button(`${t.name} — ${t.artist_name}`, () => playIndex(i));
    b.className = "vs-q-item" + (i === current ? " now" : "");
    panel.appendChild(b);
  });
}
renderQueuePanel();

// ---------- genre chips ----------
const GENRES = [
  ["Popular", null], ["Chill", "chill"], ["Rock", "rock"],
  ["Electronic", "electronic"], ["Hip-Hop", "hiphop"], ["Jazz", "jazz"],
  ["Pop", "pop"], ["Lofi", "lofi"], ["Acoustic", "acoustic"], ["Ambient", "ambient"],
];
const chips = document.createElement("div");
chips.className = "vs-chips";
GENRES.forEach(([label, tag], i) => {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "vs-chip" + (i === 0 ? " active" : "");
  chip.textContent = label;
  chip.addEventListener("click", () => {
    chips.querySelectorAll(".vs-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    setMenu("Home");
    load(`${label} music`, tag
      ? { tags: tag, order: "popularity_month" }
      : { order: "popularity_month" });
  });
  chips.appendChild(chip);
});
document.querySelector(".music-section .section-heading").after(chips);

// ---------- search + navigation ----------
function search() {
  const q = $("searchInput").value.trim();
  if (q) load(`Results for "${q}"`, { search: q });
}
$("searchBtn").addEventListener("click", search);
$("searchInput").addEventListener("keydown", (e) => { if (e.key === "Enter") search(); });

function setMenu(name) {
  document.querySelectorAll(".menu-item").forEach((b) => {
    b.classList.toggle("active", b.querySelector("span").textContent.trim() === name);
  });
}

const views = {
  Home: () => load("Popular this month", { order: "popularity_month" }),
  Trending: () => load("Trending this week", { order: "popularity_week" }),
  Favorites: () => render(store.get("vs_favs"), "Your favorites"),
  "Favorite Songs": () => render(store.get("vs_favs"), "Your favorites"),
  "Recently Played": () => render(store.get("vs_recent"), "Recently played"),
  Playlists: showPlaylists,
};

document.querySelectorAll(".menu-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    const name = btn.querySelector("span").textContent.trim();
    setMenu(name);
    if (name === "Home") chips.querySelectorAll(".vs-chip").forEach((c, i) => c.classList.toggle("active", i === 0));
    if (views[name]) views[name]();
  });
});

$("discoverBtn").addEventListener("click", () => {
  document.querySelector(".music-section").scrollIntoView({ behavior: "smooth" });
  setMenu("Trending");
  views.Trending();
});

// ---------- remove Spotify UI ----------
["spotifyBtn", "spotifyStatus", "connectMainBtn"].forEach((id) => {
  const el = $(id);
  if (el) el.style.display = "none";
});

// ---------- start ----------
views.Home();
