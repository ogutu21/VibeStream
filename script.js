// =====================================================
// VIBESTREAM
// SPOTIFY + PKCE + WEB PLAYBACK SDK
// =====================================================


// =====================================================
// SPOTIFY CONFIGURATION
// =====================================================

// IMPORTANT:
// Replace this with YOUR Spotify Client ID.

const CLIENT_ID="509e2e82b41a461fbeecaffdb678503f";


// This must EXACTLY match the Redirect URI
// registered in your Spotify Developer Dashboard.

const REDIRECT_URI =
    "https://ogutu21.github.io/VibeStream/";


// Spotify permissions

const SCOPES = [
    "streaming",
    "user-read-private",
    "user-read-email",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing"
].join(" ");


// =====================================================
// ELEMENTS
// =====================================================

const searchInput =
    document.getElementById("searchInput");

const searchBtn =
    document.getElementById("searchBtn");

const musicList =
    document.getElementById("musicList");

const currentArtwork =
    document.getElementById("currentArtwork");

const currentTitle =
    document.getElementById("currentTitle");

const currentArtist =
    document.getElementById("currentArtist");

const playButton =
    document.getElementById("playButton");

const previousButton =
    document.getElementById("previousButton");

const nextButton =
    document.getElementById("nextButton");

const progressBar =
    document.getElementById("progressBar");

const currentTime =
    document.getElementById("currentTime");

const duration =
    document.getElementById("duration");

const volumeBar =
    document.getElementById("volumeBar");

const discoverBtn =
    document.getElementById("discoverBtn");

const spotifyBtn =
    document.getElementById("spotifyBtn");

const connectMainBtn =
    document.getElementById("connectMainBtn");

const spotifyStatus =
    document.getElementById("spotifyStatus");

const resultsText =
    document.getElementById("resultsText");


// =====================================================
// VARIABLES
// =====================================================

let accessToken = null;

let refreshToken = null;

let expiresAt = 0;

let spotifyPlayer = null;

let deviceId = null;

let tracks = [];

let currentTrackIndex = -1;

let currentState = null;

let favorites =
    JSON.parse(
        localStorage.getItem("vibestreamFavorites") || "[]"
    );


// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {

    volumeBar.value = 1;

    setupEvents();

    await handleSpotifyCallback();

    loadSavedToken();

    if (accessToken) {

        updateSpotifyUI();

        initializeSpotifyPlayer();

        searchMusic("popular music");

    } else {

        showWelcome();

    }

});


// =====================================================
// EVENTS
// =====================================================

function setupEvents() {

    searchBtn.addEventListener(
        "click",
        () => searchMusic(searchInput.value)
    );


    searchInput.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                searchMusic(searchInput.value);

            }

        }
    );


    spotifyBtn.addEventListener(
        "click",
        connectSpotify
    );


    connectMainBtn.addEventListener(
        "click",
        connectSpotify
    );


    discoverBtn.addEventListener(
        "click",
        () => {

            searchInput.focus();

            searchMusic("popular music");

        }
    );


    playButton.addEventListener(
        "click",
        togglePlayback
    );


    previousButton.addEventListener(
        "click",
        previousTrack
    );


    nextButton.addEventListener(
        "click",
        nextTrack
    );


    volumeBar.addEventListener(
        "input",
        () => {

            if (spotifyPlayer) {

                spotifyPlayer.setVolume(
                    Number(volumeBar.value)
                );

            }

        }
    );


    progressBar.addEventListener(
        "input",
        seekPlayback
    );


    window.addEventListener(
        "beforeunload",
        () => {

            if (accessToken) {

                localStorage.setItem(
                    "vibestream_access_token",
                    accessToken
                );

            }

        }
    );

}


// =====================================================
// PKCE
// =====================================================

function generateRandomString(length) {

    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let result = "";

    const values =
        crypto.getRandomValues(
            new Uint8Array(length)
        );

    for (let i = 0; i < length; i++) {

        result +=
            characters[
                values[i] % characters.length
            ];

    }

    return result;
}


async function generateCodeChallenge(verifier) {

    const data =
        new TextEncoder().encode(verifier);

    const digest =
        await crypto.subtle.digest(
            "SHA-256",
            data
        );

    return base64UrlEncode(digest);

}


function base64UrlEncode(buffer) {

    return btoa(
        String.fromCharCode(
            ...new Uint8Array(buffer)
        )
    )
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

}


// =====================================================
// CONNECT SPOTIFY
// =====================================================

async function connectSpotify() {

    if (
        !CLIENT_ID ||
        CLIENT_ID === "YOUR_SPOTIFY_CLIENT_ID"
    ) {

        alert(
            "Add your Spotify Client ID to script.js first."
        );

        return;

    }


    const codeVerifier =
        generateRandomString(64);

    const codeChallenge =
        await generateCodeChallenge(
            codeVerifier
        );


    localStorage.setItem(
        "spotify_code_verifier",
        codeVerifier
    );


    const state =
        generateRandomString(16);

    localStorage.setItem(
        "spotify_state",
        state
    );


    const params =
        new URLSearchParams({

            response_type: "code",

            client_id: CLIENT_ID,

            scope: SCOPES,

            redirect_uri: REDIRECT_URI,

            state: state,

            code_challenge_method: "S256",

            code_challenge: codeChallenge

        });


    window.location.href =
        "https://accounts.spotify.com/authorize?" +
        params.toString();

}


// =====================================================
// HANDLE SPOTIFY CALLBACK
// =====================================================

async function handleSpotifyCallback() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const code =
        params.get("code");

    const state =
        params.get("state");

    const error =
        params.get("error");


    if (error) {

        alert(
            "Spotify authorization was cancelled."
        );

        cleanUrl();

        return;

    }


    if (!code) {

        return;

    }


    const savedState =
        localStorage.getItem(
            "spotify_state"
        );


    if (
        !state ||
        state !== savedState
    ) {

        alert(
            "Spotify security verification failed."
        );

        cleanUrl();

        return;

    }


    const codeVerifier =
        localStorage.getItem(
            "spotify_code_verifier"
        );


    if (!codeVerifier) {

        alert(
            "Spotify login information is missing. Please connect again."
        );

        cleanUrl();

        return;

    }


    try {

        const body =
            new URLSearchParams({

                client_id: CLIENT_ID,

                grant_type:
                    "authorization_code",

                code: code,

                redirect_uri:
                    REDIRECT_URI,

                code_verifier:
                    codeVerifier

            });


        const response =
            await fetch(
                "https://accounts.spotify.com/api/token",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/x-www-form-urlencoded"

                    },

                    body: body

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            console.error(data);

            throw new Error(
                data.error_description ||
                "Spotify token request failed."
            );

        }


        accessToken =
            data.access_token;


        refreshToken =
            data.refresh_token || null;


        expiresAt =
            Date.now() +
            (data.expires_in * 1000);


        saveToken();


        localStorage.removeItem(
            "spotify_code_verifier"
        );

        localStorage.removeItem(
            "spotify_state"
        );


        cleanUrl();


        updateSpotifyUI();


        initializeSpotifyPlayer();


        getProfile();


        searchMusic("popular music");


    } catch (error) {

        console.error(error);

        alert(
            "Spotify connection failed. Check your Client ID and Redirect URI."
        );

        cleanUrl();

    }

}


// =====================================================
// SAVE TOKEN
// =====================================================

function saveToken() {

    localStorage.setItem(
        "vibestream_access_token",
        accessToken
    );


    localStorage.setItem(
        "vibestream_expires_at",
        String(expiresAt)
    );


    if (refreshToken) {

        localStorage.setItem(
            "vibestream_refresh_token",
            refreshToken
        );

    }

}


// =====================================================
// LOAD TOKEN
// =====================================================

function loadSavedToken() {

    accessToken =
        localStorage.getItem(
            "vibestream_access_token"
        );


    refreshToken =
        localStorage.getItem(
            "vibestream_refresh_token"
        );


    expiresAt =
        Number(
            localStorage.getItem(
                "vibestream_expires_at"
            ) || 0
        );


    if (
        accessToken &&
        expiresAt &&
        Date.now() >= expiresAt
    ) {

        refreshAccessToken();

    }

}


// =====================================================
// REFRESH TOKEN
// =====================================================

async function refreshAccessToken() {

    if (!refreshToken) {

        logoutSpotify();

        return;

    }


    try {

        const body =
            new URLSearchParams({

                grant_type:
                    "refresh_token",

                refresh_token:
                    refreshToken,

                client_id:
                    CLIENT_ID

            });


        const response =
            await fetch(
                "https://accounts.spotify.com/api/token",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/x-www-form-urlencoded"

                    },

                    body: body

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error_description ||
                "Token refresh failed."
            );

        }


        accessToken =
            data.access_token;


        expiresAt =
            Date.now() +
            (data.expires_in * 1000);


        if (data.refresh_token) {

            refreshToken =
                data.refresh_token;

        }


        saveToken();


    } catch (error) {

        console.error(error);

        logoutSpotify();

    }

}


// =====================================================
// ENSURE TOKEN
// =====================================================

async function ensureToken() {

    if (!accessToken) {

        return false;

    }


    if (
        expiresAt &&
        Date.now() >= expiresAt - 60000
    ) {

        await refreshAccessToken();

    }


    return !!accessToken;

}


// =====================================================
// SPOTIFY API
// =====================================================

async function spotifyFetch(
    url,
    options = {}
) {

    await ensureToken();


    if (!accessToken) {

        throw new Error(
            "Spotify is not connected."
        );

    }


    const response =
        await fetch(
            url,
            {

                ...options,

                headers: {

                    ...(options.headers || {}),

                    Authorization:
                        `Bearer ${accessToken}`

                }

            }
        );


    if (
        response.status === 401
    ) {

        await refreshAccessToken();

        if (!accessToken) {

            throw new Error(
                "Spotify session expired."
            );

        }


        return fetch(
            url,
            {

                ...options,

                headers: {

                    ...(options.headers || {}),

                    Authorization:
                        `Bearer ${accessToken}`

                }

            }
        );

    }


    return response;

}


// =====================================================
// SEARCH SPOTIFY
// =====================================================

async function searchMusic(query) {

    if (!accessToken) {

        showWelcome();

        return;

    }


    query =
        query.trim();


    if (!query) {

        query = "popular music";

    }


    musicList.innerHTML = `

        <div class="loading">

            <div class="loading-spinner"></div>

            <p>Searching Spotify...</p>

        </div>

    `;


    try {

        const response =
            await spotifyFetch(
                "https://api.spotify.com/v1/search?" +
                new URLSearchParams({

                    q: query,

                    type: "track",

                    limit: "30"

                })
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error?.message ||
                "Spotify search failed."
            );

        }


        tracks =
            data.tracks.items || [];


        resultsText.textContent =
            `${tracks.length} tracks found for "${query}"`;


        displayTracks();


    } catch (error) {

        console.error(error);

        musicList.innerHTML = `

            <div class="welcome-card">

                <div class="welcome-icon">
                    ⚠️
                </div>

                <h3>
                    Spotify search failed
                </h3>

                <p>
                    ${escapeHtml(error.message)}
                </p>

            </div>

        `;

    }

}


// =====================================================
// DISPLAY TRACKS
// =====================================================

function displayTracks() {

    if (!tracks.length) {

        musicList.innerHTML = `

            <div class="welcome-card">

                <div class="welcome-icon">
                    🎵
                </div>

                <h3>
                    No tracks found
                </h3>

                <p>
                    Try another artist, song or keyword.
                </p>

            </div>

        `;

        return;

    }


    musicList.innerHTML =
        tracks.map(
            (track, index) => {

                const artwork =
                    track.album?.images?.[0]?.url ||
                    "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=500&q=80";


                const artist =
                    track.artists
                        .map(
                            artist => artist.name
                        )
                        .join(", ");


                const liked =
                    favorites.includes(
                        track.id
                    );


                return `

                    <article
                        class="song-card"
                    >

                        <button
                            class="favorite-btn ${liked ? "active" : ""}"
                            data-favorite="${index}"
                            title="Favorite"
                        >
                            ${liked ? "♥" : "♡"}
                        </button>


                        <img
                            src="${artwork}"
                            alt="${escapeHtml(track.name)}"
                        >


                        <h3>
                            ${escapeHtml(track.name)}
                        </h3>


                        <p>
                            ${escapeHtml(artist)}
                        </p>


                        <small>
                            ${escapeHtml(track.album?.name || "")}
                        </small>


                        <button
                            class="play-btn"
                            data-play="${index}"
                            title="Play"
                        >
                            ▶
                        </button>

                    </article>

                `;

            }
        ).join("");


    document
        .querySelectorAll("[data-play]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            button.dataset.play
                        );

                    playTrack(index);

                }
            );

        });


    document
        .querySelectorAll("[data-favorite]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            button.dataset.favorite
                        );

                    toggleFavorite(index);

                }
            );

        });

}


// =====================================================
// INITIALIZE SPOTIFY PLAYER
// =====================================================

function initializeSpotifyPlayer() {

    if (
        typeof Spotify === "undefined"
    ) {

        console.log(
            "Waiting for Spotify Web Playback SDK..."
        );

        return;

    }


    if (spotifyPlayer) {

        return;

    }


    spotifyPlayer =
        new Spotify.Player({

            name: "VibeStream",

            volume:
                Number(
                    volumeBar.value
                ),

            getOAuthToken: async callback => {

                await ensureToken();

                callback(accessToken);

            }

        });


    spotifyPlayer.addListener(
        "ready",
        ({ device_id }) => {

            deviceId =
                device_id;

            console.log(
                "Spotify player ready:",
                deviceId
            );

            spotifyStatus.textContent =
                "Spotify connected • Player ready";

        }
    );


    spotifyPlayer.addListener(
        "not_ready",
        ({ device_id }) => {

            console.log(
                "Spotify device went offline:",
                device_id
            );

            spotifyStatus.textContent =
                "Spotify player offline";

        }
    );


    spotifyPlayer.addListener(
        "player_state_changed",
        state => {

            if (!state) {

                return;

            }


            currentState =
                state;


            updatePlayerFromState(
                state
            );

        }
    );


    spotifyPlayer.addListener(
        "initialization_error",
        ({ message }) => {

            console.error(
                "Spotify initialization error:",
                message
            );

        }
    );


    spotifyPlayer.addListener(
        "authentication_error",
        ({ message }) => {

            console.error(
                "Spotify authentication error:",
                message
            );

            spotifyStatus.textContent =
                "Spotify authentication failed";

        }
    );


    spotifyPlayer.addListener(
        "account_error",
        ({ message }) => {

            console.error(
                "Spotify account error:",
                message
            );

            spotifyStatus.textContent =
                "Spotify Premium is required for playback";

        }
    );


    spotifyPlayer.connect();

}


// =====================================================
// SPOTIFY SDK READY
// =====================================================

window.onSpotifyWebPlaybackSDKReady =
    function () {

        console.log(
            "Spotify Web Playback SDK loaded."
        );


        if (accessToken) {

            initializeSpotifyPlayer();

        }

    };


// =====================================================
// PLAY TRACK
// =====================================================

async function playTrack(index) {

    if (!accessToken) {

        connectSpotify();

        return;

    }


    if (!deviceId) {

        alert(
            "Spotify player is still connecting. Please try again in a moment."
        );

        return;

    }


    const track =
        tracks[index];


    if (!track) {

        return;

    }


    currentTrackIndex =
        index;


    try {

        await spotifyFetch(
            `https://api.spotify.com/v1/me/player?device_id=${encodeURIComponent(deviceId)}&play=true`,
            {

                method: "PUT",

                headers: {

                    "Content-Type":
                        "application/json"

                }

            }
        );


        const response =
            await spotifyFetch(
                "https://api.spotify.com/v1/me/player/play",
                {

                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        uris: [
                            track.uri
                        ]

                    })

                }
            );


        if (!response.ok) {

            const data =
                await response.json()
                    .catch(() => ({}));


            throw new Error(
                data.error?.message ||
                "Unable to start playback."
            );

        }


        updateCurrentTrack(track);


    } catch (error) {

        console.error(error);

        alert(
            error.message
        );

    }

}


// =====================================================
// PLAY / PAUSE
// =====================================================

async function togglePlayback() {

    if (!spotifyPlayer) {

        alert(
            "Connect Spotify first."
        );

        return;

    }


    await spotifyPlayer.togglePlay();

}


// =====================================================
// NEXT
// =====================================================

async function nextTrack() {

    if (!spotifyPlayer) {

        return;

    }


    await spotifyPlayer.nextTrack();

}


// =====================================================
// PREVIOUS
// =====================================================

async function previousTrack() {

    if (!spotifyPlayer) {

        return;

    }


    await spotifyPlayer.previousTrack();

}


// =====================================================
// SEEK
// =====================================================

async function seekPlayback() {

    if (!spotifyPlayer || !currentState) {

        return;

    }


    const durationMs =
        currentState.duration;

    const percentage =
        Number(
            progressBar.value
        ) / 100;


    const position =
        Math.floor(
            durationMs * percentage
        );


    await spotifyPlayer.seek(
        position
    );

}


// =====================================================
// PLAYER STATE
// =====================================================

function updatePlayerFromState(state) {

    const track =
        state.track_window
            ?.current_track;


    if (!track) {

        return;

    }


    updateCurrentTrack(track);


    playButton.textContent =
        state.paused
            ? "▶"
            : "Ⅱ";


    const position =
        state.position || 0;

    const durationMs =
        state.duration || 0;


    progressBar.value =
        durationMs
            ? (position / durationMs) * 100
            : 0;


    currentTime.textContent =
        formatTime(position);


    duration.textContent =
        formatTime(durationMs);

}


// =====================================================
// UPDATE CURRENT TRACK
// =====================================================

function updateCurrentTrack(track) {

    if (!track) {

        return;

    }


    currentTitle.textContent =
        track.name;


    currentArtist.textContent =
        track.artists
            .map(
                artist => artist.name
            )
            .join(", ");


    if (
        track.album &&
        track.album.images &&
        track.album.images.length
    ) {

        currentArtwork.src =
            track.album.images[0].url;

    }

}


// =====================================================
// FORMAT TIME
// =====================================================

function formatTime(milliseconds) {

    const seconds =
        Math.floor(
            milliseconds / 1000
        );


    const minutes =
        Math.floor(
            seconds / 60
        );


    const remaining =
        seconds % 60;


    return `${minutes}:${String(remaining).padStart(2, "0")}`;

}


// =====================================================
// FAVORITES
// =====================================================

function toggleFavorite(index) {

    const track =
        tracks[index];


    if (!track) {

        return;

    }


    const existing =
        favorites.indexOf(
            track.id
        );


    if (existing >= 0) {

        favorites.splice(
            existing,
            1
        );

    } else {

        favorites.push(
            track.id
        );

    }


    localStorage.setItem(
        "vibestreamFavorites",
        JSON.stringify(favorites)
    );


    displayTracks();

}


// =====================================================
// PROFILE
// =====================================================

async function getProfile() {

    try {

        const response =
            await spotifyFetch(
                "https://api.spotify.com/v1/me"
            );


        const profile =
            await response.json();


        if (!response.ok) {

            return;

        }


        spotifyStatus.textContent =
            `Connected as ${profile.display_name || "Spotify user"}`;

    } catch (error) {

        console.error(
            error
        );

    }

}


// =====================================================
// UI
// =====================================================

function updateSpotifyUI() {

    spotifyBtn.textContent =
        "✓ Spotify Connected";

    spotifyBtn.style.background =
        "#1ed760";

    connectMainBtn.style.display =
        "none";

    spotifyStatus.textContent =
        "Spotify connected";

}


function showWelcome() {

    musicList.innerHTML = `

        <div class="welcome-card">

            <div class="welcome-icon">
                🎧
            </div>

            <h3>
                Welcome to VibeStream
            </h3>

            <p>
                Connect your Spotify account
                to search and play music.
            </p>

            <button
                class="connect-main-btn"
                id="connectAgainBtn"
                type="button"
            >
                Connect Spotify
            </button>

        </div>

    `;


    const button =
        document.getElementById(
            "connectAgainBtn"
        );


    if (button) {

        button.addEventListener(
            "click",
            connectSpotify
        );

    }

}


// =====================================================
// LOGOUT
// =====================================================

function logoutSpotify() {

    accessToken = null;

    refreshToken = null;

    expiresAt = 0;

    deviceId = null;


    localStorage.removeItem(
        "vibestream_access_token"
    );

    localStorage.removeItem(
        "vibestream_refresh_token"
    );

    localStorage.removeItem(
        "vibestream_expires_at"
    );


    if (spotifyPlayer) {

        spotifyPlayer.disconnect();

        spotifyPlayer = null;

    }


    spotifyBtn.textContent =
        "🎵 Connect Spotify";


    spotifyStatus.textContent =
        "Spotify not connected";


    showWelcome();

}


// =====================================================
// CLEAN URL
// =====================================================

function cleanUrl() {

    window.history.replaceState(
        {},
        document.title,
        REDIRECT_URI
    );

}


// =====================================================
// HTML ESCAPING
// =====================================================

function escapeHtml(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}
