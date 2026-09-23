// =====================================================
// VIBESTREAM
// SPOTIFY + PKCE + WEB PLAYBACK SDK
// =====================================================


// =====================================================
// SPOTIFY CONFIGURATION
// =====================================================

// IMPORTANT:
// Put your real Spotify Client ID here.
const CLIENT_ID = "509e2e82b41a461fbeecaffdb678503f";


// This MUST exactly match the Redirect URI
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
// DOM ELEMENTS
// =====================================================

let searchInput;
let searchBtn;
let musicList;

let currentArtwork;
let currentTitle;
let currentArtist;

let playButton;
let previousButton;
let nextButton;

let progressBar;
let currentTime;
let duration;

let volumeBar;

let discoverBtn;
let spotifyBtn;
let connectMainBtn;

let spotifyStatus;
let resultsText;


// =====================================================
// APPLICATION STATE
// =====================================================

let accessToken = null;
let refreshToken = null;
let expiresAt = null;

let spotifyPlayer = null;
let deviceId = null;

let tracks = [];
let currentTrackIndex = -1;

let currentState = null;

let favorites = [];


// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {

    console.log("VibeStream initializing...");

    initializeElements();

    setupEvents();

    loadFavorites();

    await handleSpotifyCallback();

    await loadSavedToken();

    updateSpotifyUI();

    if (accessToken) {

        console.log("Spotify access token available.");

        initializeSpotifyPlayer();

        await getSpotifyProfile();

        await searchMusic("popular music");

    } else {

        console.log("Spotify is not connected.");

        showWelcomeMessage();
    }

    console.log("VibeStream initialization complete.");

});


// =====================================================
// GET DOM ELEMENTS
// =====================================================

function initializeElements() {

    searchInput =
        document.getElementById("searchInput");

    searchBtn =
        document.getElementById("searchBtn");

    musicList =
        document.getElementById("musicList");

    currentArtwork =
        document.getElementById("currentArtwork");

    currentTitle =
        document.getElementById("currentTitle");

    currentArtist =
        document.getElementById("currentArtist");

    playButton =
        document.getElementById("playButton");

    previousButton =
        document.getElementById("previousButton");

    nextButton =
        document.getElementById("nextButton");

    progressBar =
        document.getElementById("progressBar");

    currentTime =
        document.getElementById("currentTime");

    duration =
        document.getElementById("duration");

    volumeBar =
        document.getElementById("volumeBar");

    discoverBtn =
        document.getElementById("discoverBtn");

    spotifyBtn =
        document.getElementById("spotifyBtn");

    connectMainBtn =
        document.getElementById("connectMainBtn");

    spotifyStatus =
        document.getElementById("spotifyStatus");

    resultsText =
        document.getElementById("resultsText");

}


// =====================================================
// EVENT LISTENERS
// =====================================================

function setupEvents() {

    console.log("Setting up VibeStream events...");


    // SEARCH BUTTON

    if (searchBtn) {

        searchBtn.addEventListener("click", () => {

            const query =
                searchInput?.value.trim();

            if (query) {
                searchMusic(query);
            }

        });

    }


    // SEARCH WITH ENTER

    if (searchInput) {

        searchInput.addEventListener("keydown", (event) => {

            if (event.key === "Enter") {

                const query =
                    searchInput.value.trim();

                if (query) {
                    searchMusic(query);
                }

            }

        });

    }


    // SPOTIFY BUTTON

    if (spotifyBtn) {

        spotifyBtn.addEventListener(
            "click",
            connectSpotify
        );

    }


    // MAIN CONNECT BUTTON

    if (connectMainBtn) {

        connectMainBtn.addEventListener(
            "click",
            connectSpotify
        );

    }


    // DISCOVER BUTTON

    if (discoverBtn) {

        discoverBtn.addEventListener("click", () => {

            if (!accessToken) {

                connectSpotify();

                return;
            }

            searchMusic("popular music");

        });

    }


    // PLAY / PAUSE

    if (playButton) {

        playButton.addEventListener(
            "click",
            togglePlay
        );

    }


    // PREVIOUS

    if (previousButton) {

        previousButton.addEventListener(
            "click",
            playPrevious
        );

    }


    // NEXT

    if (nextButton) {

        nextButton.addEventListener(
            "click",
            playNext
        );

    }


    // PROGRESS BAR

    if (progressBar) {

        progressBar.addEventListener(
            "input",
            seekTrack
        );

    }


    // VOLUME

    if (volumeBar) {

        volumeBar.addEventListener(
            "input",
            changeVolume
        );

    }


    // SAVE TOKEN BEFORE PAGE CLOSES

    window.addEventListener("beforeunload", () => {

        saveToken();

    });


    console.log(
        "VibeStream events initialized successfully."
    );

}


// =====================================================
// PKCE
// =====================================================

function generateRandomString(length = 64) {

    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let result = "";

    const values =
        new Uint8Array(length);

    crypto.getRandomValues(values);

    for (let i = 0; i < length; i++) {

        result +=
            characters[
                values[i] % characters.length
            ];

    }

    return result;

}


// =====================================================
// BASE64 URL ENCODE
// =====================================================

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
// CODE CHALLENGE
// =====================================================

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


// =====================================================
// CONNECT SPOTIFY
// =====================================================

async function connectSpotify() {

    if (
        !CLIENT_ID ||
        CLIENT_ID === "YOUR_SPOTIFY_CLIENT_ID"
    ) {

        alert(
            "Please add your Spotify Client ID to script.js first."
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


    const authorizationUrl =
        new URL(
            "https://accounts.spotify.com/authorize"
        );


    authorizationUrl.searchParams.set(
        "client_id",
        CLIENT_ID
    );

    authorizationUrl.searchParams.set(
        "response_type",
        "code"
    );

    authorizationUrl.searchParams.set(
        "redirect_uri",
        REDIRECT_URI
    );

    authorizationUrl.searchParams.set(
        "code_challenge_method",
        "S256"
    );

    authorizationUrl.searchParams.set(
        "code_challenge",
        codeChallenge
    );

    authorizationUrl.searchParams.set(
        "scope",
        SCOPES
    );


    console.log(
        "Redirecting to Spotify authorization..."
    );


    window.location.href =
        authorizationUrl.toString();

}


// =====================================================
// HANDLE SPOTIFY CALLBACK
// =====================================================

async function handleSpotifyCallback() {

    const url =
        new URL(window.location.href);

    const code =
        url.searchParams.get("code");

    const error =
        url.searchParams.get("error");


    if (error) {

        console.error(
            "Spotify authorization error:",
            error
        );

        cleanUrl();

        return;
    }


    if (!code) {
        return;
    }


    const codeVerifier =
        localStorage.getItem(
            "spotify_code_verifier"
        );


    if (!codeVerifier) {

        console.error(
            "Spotify code verifier missing."
        );

        return;
    }


    try {

        console.log(
            "Exchanging Spotify authorization code..."
        );


        const response =
            await fetch(
                "https://accounts.spotify.com/api/token",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded"
                    },

                    body:
                        new URLSearchParams({

                            client_id:
                                CLIENT_ID,

                            grant_type:
                                "authorization_code",

                            code:
                                code,

                            redirect_uri:
                                REDIRECT_URI,

                            code_verifier:
                                codeVerifier

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            console.error(
                "Spotify token error:",
                data
            );

            throw new Error(
                data.error_description ||
                "Spotify authorization failed."
            );

        }


        accessToken =
            data.access_token;

        refreshToken =
            data.refresh_token ||
            refreshToken;

        expiresAt =
            Date.now() +
            (data.expires_in * 1000);


        saveToken();


        localStorage.removeItem(
            "spotify_code_verifier"
        );


        cleanUrl();


        console.log(
            "Spotify authorization successful."
        );


    } catch (error) {

        console.error(
            "Spotify callback error:",
            error
        );

        showError(
            error.message
        );

    }

}


// =====================================================
// SAVE TOKEN
// =====================================================

function saveToken() {

    if (!accessToken) {
        return;
    }


    localStorage.setItem(
        "vibestream_access_token",
        accessToken
    );


    if (refreshToken) {

        localStorage.setItem(
            "vibestream_refresh_token",
            refreshToken
        );

    }


    if (expiresAt) {

        localStorage.setItem(
            "vibestream_expires_at",
            expiresAt.toString()
        );

    }

}


// =====================================================
// LOAD SAVED TOKEN
// =====================================================

async function loadSavedToken() {

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
            )
        ) || null;


    if (!accessToken) {
        return;
    }


    if (
        expiresAt &&
        Date.now() >= expiresAt - 60000
    ) {

        console.log(
            "Spotify access token expired. Refreshing..."
        );

        await refreshAccessToken();

    }

}


// =====================================================
// REFRESH ACCESS TOKEN
// =====================================================

async function refreshAccessToken() {

    if (!refreshToken) {

        console.log(
            "No Spotify refresh token available."
        );

        logoutSpotify();

        return false;
    }


    try {

        const response =
            await fetch(
                "https://accounts.spotify.com/api/token",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded"
                    },

                    body:
                        new URLSearchParams({

                            client_id:
                                CLIENT_ID,

                            grant_type:
                                "refresh_token",

                            refresh_token:
                                refreshToken

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            console.error(
                "Token refresh failed:",
                data
            );

            logoutSpotify();

            return false;
        }


        accessToken =
            data.access_token;


        if (data.refresh_token) {

            refreshToken =
                data.refresh_token;

        }


        expiresAt =
            Date.now() +
            (data.expires_in * 1000);


        saveToken();


        console.log(
            "Spotify access token refreshed."
        );


        return true;


    } catch (error) {

        console.error(
            "Token refresh error:",
            error
        );

        return false;
    }

}


// =====================================================
// ENSURE VALID TOKEN
// =====================================================

async function ensureValidToken() {

    if (!accessToken) {
        return false;
    }


    if (
        expiresAt &&
        Date.now() >= expiresAt - 60000
    ) {

        return await refreshAccessToken();

    }


    return true;

}


// =====================================================
// SPOTIFY FETCH
// =====================================================

async function spotifyFetch(
    url,
    options = {}
) {

    const valid =
        await ensureValidToken();


    if (!valid) {

        throw new Error(
            "Spotify is not connected."
        );

    }


    const headers = {

        ...(options.headers || {}),

        Authorization:
            `Bearer ${accessToken}`

    };


    let response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );


    // Try refreshing once if unauthorized

    if (response.status === 401) {

        console.log(
            "Spotify token expired. Refreshing..."
        );


        const refreshed =
            await refreshAccessToken();


        if (refreshed) {

            headers.Authorization =
                `Bearer ${accessToken}`;


            response =
                await fetch(
                    url,
                    {
                        ...options,
                        headers
                    }
                );

        }

    }


    if (!response.ok) {

        let errorMessage =
            `Spotify API error: ${response.status}`;

        try {

            const errorData =
                await response.json();

            errorMessage =
                errorData.error?.message ||
                errorData.error_description ||
                errorMessage;

        } catch (_) {}


        throw new Error(
            errorMessage
        );

    }


    return await response.json();

}


// =====================================================
// SEARCH MUSIC
// =====================================================

async function searchMusic(query) {

    if (!accessToken) {

        showWelcomeMessage();

        return;
    }


    query =
        query?.trim() ||
        "popular music";


    try {

        console.log(
            "Searching Spotify for:",
            query
        );


        const encodedQuery =
            encodeURIComponent(query);


        // IMPORTANT:
        // limit=20 fixes the previous
        // "Invalid limit" error.

        const url =
            `https://api.spotify.com/v1/search?q=${encodedQuery}&type=track&limit=20`;


        const response =
            await spotifyFetch(url);


        if (
            !response ||
            !response.tracks
        ) {

            throw new Error(
                "Spotify returned an invalid response."
            );

        }


        tracks =
            response.tracks.items || [];


        currentTrackIndex = -1;


        displayTracks(tracks);


        if (resultsText) {

            resultsText.textContent =
                `${tracks.length} songs found for "${query}"`;

        }


        console.log(
            `Spotify search completed: ${tracks.length} tracks found.`
        );


    } catch (error) {

        console.error(
            "Spotify search error:",
            error
        );


        if (musicList) {

            musicList.innerHTML = `

                <div class="error-message">

                    <h3>Unable to load music</h3>

                    <p>
                        ${escapeHtml(error.message)}
                    </p>

                </div>

            `;

        }


        if (resultsText) {

            resultsText.textContent =
                "There was a problem loading Spotify music.";

        }

    }

}


// =====================================================
// DISPLAY TRACKS
// =====================================================

function displayTracks(trackList) {

    if (!musicList) {
        return;
    }


    if (!trackList || trackList.length === 0) {

        musicList.innerHTML = `

            <div class="empty-message">

                <h3>No music found</h3>

                <p>
                    Try searching for another artist or song.
                </p>

            </div>

        `;

        return;
    }


    musicList.innerHTML = "";


    trackList.forEach(
        (track, index) => {

            const card =
                document.createElement("div");


            card.className =
                "music-card";


            const artwork =
                track.album?.images?.[0]?.url ||
                "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=500&q=80";


            const artistName =
                track.artists
                    ?.map(
                        artist =>
                            artist.name
                    )
                    .join(", ") ||
                "Unknown artist";


            const isFavorite =
                favorites.some(
                    item =>
                        item.id === track.id
                );


            card.innerHTML = `

                <img
                    class="music-image"
                    src="${escapeHtml(artwork)}"
                    alt="Album artwork"
                    loading="lazy"
                >

                <h3>
                    ${escapeHtml(track.name)}
                </h3>

                <p>
                    ${escapeHtml(artistName)}
                </p>

                <div class="card-bottom">

                    <button
                        class="play-card"
                        type="button"
                        title="Play"
                    >
                        ▶
                    </button>

                    <button
                        class="favorite-button"
                        type="button"
                        title="Favorite"
                    >
                        ${isFavorite ? "❤️" : "♡"}
                    </button>

                </div>
            `;


            const playCard =
                card.querySelector(
                    ".play-card"
                );


            const favoriteButton =
                card.querySelector(
                    ".favorite-button"
                );


            if (playCard) {

                playCard.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                        playTrack(index);

                    }
                );

            }


            if (favoriteButton) {

                favoriteButton.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                        toggleFavorite(
                            track,
                            favoriteButton
                        );

                    }
                );

            }


            card.addEventListener(
                "click",
                () => {

                    playTrack(index);

                }
            );


            musicList.appendChild(card);

        }
    );

}


// =====================================================
// SPOTIFY WEB PLAYBACK SDK
// =====================================================

function initializeSpotifyPlayer() {

    if (!accessToken) {
        return;
    }


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


    console.log(
        "Initializing Spotify Web Playback SDK..."
    );


    spotifyPlayer =
        new Spotify.Player({

            name: "VibeStream Web Player",

            getOAuthToken: async callback => {

                const valid =
                    await ensureValidToken();


                if (valid) {

                    callback(
                        accessToken
                    );

                }

            },

            volume: 1

        });


    // =================================================
    // READY
    // =================================================

    spotifyPlayer.addListener(
        "ready",
        ({ device_id }) => {

            deviceId =
                device_id;


            console.log(
                "Spotify player ready:",
                deviceId
            );


            updateSpotifyStatus(
                "Spotify connected"
            );

        }
    );


    // =================================================
    // NOT READY
    // =================================================

    spotifyPlayer.addListener(
        "not_ready",
        ({ device_id }) => {

            console.log(
                "Spotify device went offline:",
                device_id
            );

        }
    );


    // =================================================
    // PLAYER STATE
    // =================================================

    spotifyPlayer.addListener(
        "player_state_changed",
        state => {

            if (!state) {
                return;
            }


            currentState =
                state;


            updatePlayerState(
                state
            );

        }
    );


    // =================================================
    // INITIALIZATION ERROR
    // =================================================

    spotifyPlayer.addListener(
        "initialization_error",
        ({ message }) => {

            console.error(
                "Spotify initialization error:",
                message
            );

        }
    );


    // =================================================
    // AUTH ERROR
    // =================================================

    spotifyPlayer.addListener(
        "authentication_error",
        ({ message }) => {

            console.error(
                "Spotify authentication error:",
                message
            );


            updateSpotifyStatus(
                "Spotify authentication failed"
            );

        }
    );


    // =================================================
    // ACCOUNT ERROR
    // =================================================

    spotifyPlayer.addListener(
        "account_error",
        ({ message }) => {

            console.error(
                "Spotify account error:",
                message
            );


            updateSpotifyStatus(
                "Spotify Premium required"
            );

        }
    );


    // =================================================
    // PLAYBACK ERROR
    // =================================================

    spotifyPlayer.addListener(
        "playback_error",
        ({ message }) => {

            console.error(
                "Spotify playback error:",
                message
            );

        }
    );


    spotifyPlayer.connect();

}


// =====================================================
// PLAY TRACK
// =====================================================

async function playTrack(index) {

    if (!accessToken) {

        connectSpotify();

        return;
    }


    if (
        index < 0 ||
        index >= tracks.length
    ) {

        return;

    }


    currentTrackIndex =
        index;


    const track =
        tracks[index];


    updateNowPlaying(
        track
    );


    if (!deviceId) {

        console.log(
            "Spotify player device is not ready yet."
        );


        if (spotifyPlayer) {

            await spotifyPlayer.connect();

        }


        return;
    }


    try {

        const valid =
            await ensureValidToken();


        if (!valid) {
            return;
        }


        console.log(
            "Playing:",
            track.name
        );


        await fetch(
            `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
            {
                method: "PUT",

                headers: {
                    Authorization:
                        `Bearer ${accessToken}`,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({

                        uris: [
                            track.uri
                        ]

                    })

            }
        )
        .then(async response => {

            if (!response.ok) {

                let message =
                    `Playback error: ${response.status}`;

                try {

                    const data =
                        await response.json();

                    message =
                        data.error?.message ||
                        message;

                } catch (_) {}


                throw new Error(
                    message
                );

            }

        });


        updatePlayButton(true);


    } catch (error) {

        console.error(
            "Playback error:",
            error
        );


        alert(
            error.message
        );

    }

}


// =====================================================
// TOGGLE PLAY
// =====================================================

async function togglePlay() {

    if (!spotifyPlayer) {

        if (!accessToken) {

            connectSpotify();

            return;

        }


        initializeSpotifyPlayer();

        return;

    }


    try {

        await spotifyPlayer.togglePlay();

    } catch (error) {

        console.error(
            "Play/pause error:",
            error
        );

    }

}


// =====================================================
// PREVIOUS TRACK
// =====================================================

async function playPrevious() {

    if (!tracks.length) {
        return;
    }


    if (
        currentTrackIndex <= 0
    ) {

        currentTrackIndex =
            tracks.length - 1;

    } else {

        currentTrackIndex--;

    }


    await playTrack(
        currentTrackIndex
    );

}


// =====================================================
// NEXT TRACK
// =====================================================

async function playNext() {

    if (!tracks.length) {
        return;
    }


    if (
        currentTrackIndex >=
        tracks.length - 1
    ) {

        currentTrackIndex = 0;

    } else {

        currentTrackIndex++;

    }


    await playTrack(
        currentTrackIndex
    );

}


// =====================================================
// SEEK
// =====================================================

async function seekTrack() {

    if (!spotifyPlayer) {
        return;
    }


    if (!currentState) {
        return;
    }


    const durationMs =
        currentState.duration;


    const percentage =
        Number(progressBar.value);


    const position =
        (percentage / 100) *
        durationMs;


    try {

        await spotifyPlayer.seek(
            position
        );

    } catch (error) {

        console.error(
            "Seek error:",
            error
        );

    }

}


// =====================================================
// CHANGE VOLUME
// =====================================================

async function changeVolume() {

    if (!spotifyPlayer) {
        return;
    }


    const volume =
        Number(volumeBar.value);


    try {

        await spotifyPlayer.setVolume(
            volume
        );

    } catch (error) {

        console.error(
            "Volume error:",
            error
        );

    }

}


// =====================================================
// UPDATE PLAYER STATE
// =====================================================

function updatePlayerState(state) {

    if (!state) {
        return;
    }


    const track =
        state.track_window?.current_track;


    if (track) {

        updateNowPlaying(
            track
        );

    }


    const position =
        state.position || 0;


    const trackDuration =
        state.duration || 0;


    if (currentTime) {

        currentTime.textContent =
            formatTime(position);

    }


    if (duration) {

        duration.textContent =
            formatTime(trackDuration);

    }


    if (progressBar) {

        progressBar.value =
            trackDuration
                ? (position / trackDuration) * 100
                : 0;

    }


    updatePlayButton(
        !state.paused
    );

}


// =====================================================
// UPDATE NOW PLAYING
// =====================================================

function updateNowPlaying(track) {

    if (!track) {
        return;
    }


    const artwork =
        track.album?.images?.[0]?.url;


    const artist =
        track.artists
            ?.map(
                item =>
                    item.name
            )
            .join(", ");


    if (currentArtwork && artwork) {

        currentArtwork.src =
            artwork;

    }


    if (currentTitle) {

        currentTitle.textContent =
            track.name ||
            "Unknown song";

    }


    if (currentArtist) {

        currentArtist.textContent =
            artist ||
            "Unknown artist";

    }

}


// =====================================================
// UPDATE PLAY BUTTON
// =====================================================

function updatePlayButton(isPlaying) {

    if (!playButton) {
        return;
    }


    playButton.textContent =
        isPlaying
            ? "⏸"
            : "▶";

}


// =====================================================
// FORMAT TIME
// =====================================================

function formatTime(milliseconds) {

    const totalSeconds =
        Math.floor(
            milliseconds / 1000
        );


    const minutes =
        Math.floor(
            totalSeconds / 60
        );


    const seconds =
        totalSeconds % 60;


    return (
        minutes +
        ":" +
        String(seconds).padStart(
            2,
            "0"
        )
    );

}


// =====================================================
// FAVORITES
// =====================================================

function loadFavorites() {

    try {

        favorites =
            JSON.parse(
                localStorage.getItem(
                    "vibestream_favorites"
                )
            ) || [];

    } catch (error) {

        favorites = [];

    }

}


// =====================================================
// SAVE FAVORITES
// =====================================================

function saveFavorites() {

    localStorage.setItem(
        "vibestream_favorites",
        JSON.stringify(
            favorites
        )
    );

}


// =====================================================
// TOGGLE FAVORITE
// =====================================================

function toggleFavorite(
    track,
    button
) {

    const existingIndex =
        favorites.findIndex(
            item =>
                item.id === track.id
        );


    if (existingIndex >= 0) {

        favorites.splice(
            existingIndex,
            1
        );

        button.textContent =
            "♡";

    } else {

        favorites.push({
            id: track.id,
            name: track.name,
            uri: track.uri,
            artists: track.artists,
            album: track.album
        });

        button.textContent =
            "❤️";

    }


    saveFavorites();

}


// =====================================================
// GET SPOTIFY PROFILE
// =====================================================

async function getSpotifyProfile() {

    try {

        const profile =
            await spotifyFetch(
                "https://api.spotify.com/v1/me"
            );


        console.log(
            "Spotify profile:",
            profile.display_name
        );


        updateSpotifyStatus(
            `Connected: ${profile.display_name || "Spotify"}`
        );


    } catch (error) {

        console.error(
            "Could not get Spotify profile:",
            error
        );

    }

}


// =====================================================
// UPDATE SPOTIFY UI
// =====================================================

function updateSpotifyUI() {

    if (accessToken) {

        if (spotifyBtn) {

            spotifyBtn.textContent =
                "Spotify Connected";

        }


        if (connectMainBtn) {

            connectMainBtn.textContent =
                "Spotify Connected";

        }


        updateSpotifyStatus(
            "Spotify connected"
        );

    } else {

        if (spotifyBtn) {

            spotifyBtn.textContent =
                "Connect Spotify";

        }


        if (connectMainBtn) {

            connectMainBtn.textContent =
                "Connect Spotify";

        }


        updateSpotifyStatus(
            "Spotify not connected"
        );

    }

}


// =====================================================
// SPOTIFY STATUS
// =====================================================

function updateSpotifyStatus(message) {

    if (spotifyStatus) {

        spotifyStatus.textContent =
            message;

    }

}


// =====================================================
// WELCOME MESSAGE
// =====================================================

function showWelcomeMessage() {

    if (!musicList) {
        return;
    }


    musicList.innerHTML = `

        <div class="empty-message">

            <h3>
                Welcome to VibeStream
            </h3>

            <p>
                Connect your Spotify account
                to search and play music.
            </p>

        </div>

    `;


    if (resultsText) {

        resultsText.textContent =
            "Connect Spotify to start listening";

    }

}


// =====================================================
// ERROR MESSAGE
// =====================================================

function showError(message) {

    if (!musicList) {
        return;
    }


    musicList.innerHTML = `

        <div class="error-message">

            <h3>
                Something went wrong
            </h3>

            <p>
                ${escapeHtml(message)}
            </p>

        </div>

    `;

}


// =====================================================
// LOGOUT
// =====================================================

function logoutSpotify() {

    accessToken = null;
    refreshToken = null;
    expiresAt = null;

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


    updateSpotifyUI();

    showWelcomeMessage();

}


// =====================================================
// CLEAN URL
// =====================================================

function cleanUrl() {

    const clean =
        window.location.origin +
        window.location.pathname;


    window.history.replaceState(
        {},
        document.title,
        clean
    );

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(value) {

    if (value === null ||
        value === undefined) {

        return "";

    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =====================================================
// SPOTIFY SDK READY CALLBACK
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
// FINAL DEBUG MESSAGE
// =====================================================

console.log(
    "VibeStream script.js loaded successfully."
);
