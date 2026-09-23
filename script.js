// =====================================================
// VIBESTREAM
// Online Music Player
// =====================================================


// =====================================================
// JAMENDO API
// =====================================================

const CLIENT_ID = "17af633d";


// =====================================================
// ELEMENTS
// =====================================================

const audioPlayer =
    document.getElementById("audioPlayer");

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


// =====================================================
// VARIABLES
// =====================================================

let tracks = [];

let currentTrackIndex = -1;


// =====================================================
// INITIAL AUDIO SETTINGS
// =====================================================

audioPlayer.volume = 1;

volumeBar.value = 1;


// =====================================================
// SEARCH MUSIC
// =====================================================

async function searchMusic(query) {

    query = query.trim();

    if (query === "") {
        query = "electronic";
    }


    musicList.innerHTML = `

        <div class="loading">

            <div class="loading-spinner"></div>

            <p>
                Searching for music...
            </p>

        </div>

    `;


    try {

        const url =
            "https://api.jamendo.com/v3.0/tracks/" +
            "?client_id=" +
            encodeURIComponent(CLIENT_ID) +
            "&format=json" +
            "&limit=24" +
            "&audioformat=mp32" +
            "&imagesize=300" +
            "&search=" +
            encodeURIComponent(query);


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "API request failed"
            );

        }


        const data =
            await response.json();


        if (
            !data.results ||
            data.results.length === 0
        ) {

            tracks = [];

            musicList.innerHTML = `

                <div class="loading">

                    <p>
                        No music found.
                    </p>

                </div>

            `;

            return;
        }


        tracks = data.results;


        displayTracks();

    }

    catch (error) {

        console.error(error);


        musicList.innerHTML = `

            <div class="loading">

                <p>
                    Unable to load music.
                </p>

                <small>
                    Check your internet connection
                    and API Client ID.
                </small>

            </div>

        `;

    }

}


// =====================================================
// DISPLAY TRACKS
// =====================================================

function displayTracks() {

    musicList.innerHTML = "";


    tracks.forEach(
        (track, index) => {

            const card =
                document.createElement("div");


            card.className =
                "song-card";


            const artwork =
                track.album_image ||
                track.image ||
                "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=500&q=80";


            card.innerHTML = `

                <img
                    src="${escapeHTML(artwork)}"
                    alt="Album artwork"
                    loading="lazy"
                >

                <div class="song-info">

                    <h3>
                        ${escapeHTML(
                            track.name ||
                            "Unknown Song"
                        )}
                    </h3>

                    <p>
                        ${escapeHTML(
                            track.artist_name ||
                            "Unknown Artist"
                        )}
                    </p>

                    <small>
                        ${escapeHTML(
                            track.album_name ||
                            "Single"
                        )}
                    </small>

                </div>

                <button
                    class="play-btn"
                    type="button"
                    title="Play"
                >
                    ▶
                </button>

            `;


            const playBtn =
                card.querySelector(
                    ".play-btn"
                );


            playBtn.addEventListener(
                "click",
                function () {

                    playTrack(index);

                }
            );


            musicList.appendChild(card);

        }
    );

}


// =====================================================
// PLAY TRACK
// =====================================================

function playTrack(index) {

    if (
        index < 0 ||
        index >= tracks.length
    ) {
        return;
    }


    const track =
        tracks[index];


    if (!track.audio) {

        console.error(
            "No audio URL available."
        );

        return;
    }


    currentTrackIndex =
        index;


    audioPlayer.src =
        track.audio;


    updateCurrentSong(track);


    progressBar.value = 0;


    audioPlayer.play()
        .then(function () {

            updatePlayButton();

        })
        .catch(function (error) {

            console.error(
                "Playback failed:",
                error
            );

        });

}


// =====================================================
// CURRENT SONG
// =====================================================

function updateCurrentSong(track) {

    currentTitle.textContent =
        track.name ||
        "Unknown Song";


    currentArtist.textContent =
        track.artist_name ||
        "Unknown Artist";


    currentArtwork.src =
        track.album_image ||
        track.image ||
        "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=500&q=80";

}


// =====================================================
// PLAY / PAUSE
// =====================================================

function togglePlay() {

    if (!audioPlayer.src) {

        if (tracks.length > 0) {

            playTrack(0);

        }

        return;
    }


    if (audioPlayer.paused) {

        audioPlayer.play();

    } else {

        audioPlayer.pause();

    }

}


// =====================================================
// PLAY BUTTON
// =====================================================

function updatePlayButton() {

    if (audioPlayer.paused) {

        playButton.textContent = "▶";

    } else {

        playButton.textContent = "⏸";

    }

}


// =====================================================
// NEXT TRACK
// =====================================================

function nextTrack() {

    if (tracks.length === 0) {
        return;
    }


    let nextIndex =
        currentTrackIndex + 1;


    if (
        nextIndex >= tracks.length
    ) {

        nextIndex = 0;

    }


    playTrack(nextIndex);

}


// =====================================================
// PREVIOUS TRACK
// =====================================================

function previousTrack() {

    if (tracks.length === 0) {
        return;
    }


    let previousIndex =
        currentTrackIndex - 1;


    if (previousIndex < 0) {

        previousIndex =
            tracks.length - 1;

    }


    playTrack(previousIndex);

}


// =====================================================
// PROGRESS
// =====================================================

audioPlayer.addEventListener(
    "loadedmetadata",
    function () {

        if (
            Number.isFinite(
                audioPlayer.duration
            )
        ) {

            progressBar.max =
                audioPlayer.duration;


            duration.textContent =
                formatTime(
                    audioPlayer.duration
                );

        }

    }
);


audioPlayer.addEventListener(
    "timeupdate",
    function () {

        if (
            Number.isFinite(
                audioPlayer.duration
            )
        ) {

            progressBar.value =
                audioPlayer.currentTime;


            currentTime.textContent =
                formatTime(
                    audioPlayer.currentTime
                );

        }

    }
);


// =====================================================
// SEEK
// =====================================================

progressBar.addEventListener(
    "input",
    function () {

        audioPlayer.currentTime =
            Number(progressBar.value);

    }
);


// =====================================================
// VOLUME
// =====================================================

volumeBar.addEventListener(
    "input",
    function () {

        audioPlayer.volume =
            Number(volumeBar.value);

    }
);


// =====================================================
// AUDIO EVENTS
// =====================================================

audioPlayer.addEventListener(
    "play",
    function () {

        updatePlayButton();

    }
);


audioPlayer.addEventListener(
    "pause",
    function () {

        updatePlayButton();

    }
);


audioPlayer.addEventListener(
    "ended",
    function () {

        nextTrack();

    }
);


// =====================================================
// SEARCH BUTTON
// =====================================================

searchBtn.addEventListener(
    "click",
    function () {

        searchMusic(
            searchInput.value
        );

    }
);


// =====================================================
// SEARCH WITH ENTER
// =====================================================

searchInput.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            searchMusic(
                searchInput.value
            );

        }

    }
);


// =====================================================
// DISCOVER BUTTON
// =====================================================

discoverBtn.addEventListener(
    "click",
    function () {

        searchInput.value =
            "electronic";


        searchMusic(
            "electronic"
        );

    }
);


// =====================================================
// PLAYER BUTTONS
// =====================================================

playButton.addEventListener(
    "click",
    togglePlay
);

previousButton.addEventListener(
    "click",
    previousTrack
);

nextButton.addEventListener(
    "click",
    nextTrack
);


// =====================================================
// FORMAT TIME
// =====================================================

function formatTime(seconds) {

    if (
        !Number.isFinite(seconds) ||
        seconds < 0
    ) {

        return "0:00";

    }


    const minutes =
        Math.floor(seconds / 60);


    const secondsLeft =
        Math.floor(seconds % 60);


    return (
        minutes +
        ":" +
        String(secondsLeft)
            .padStart(2, "0")
    );

}


// =====================================================
// HTML SECURITY
// =====================================================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =====================================================
// START VIBESTREAM
// =====================================================

searchMusic("electronic");