// ============================================================
// GLOBAL STATE
// ============================================================

let selectedAudioBlob = null;
let selectedAudioName = null;
let selectedAudioUrl = null;

let mediaRecorder = null;
let recordedChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;

let agentAudioBlob = null;
let agentAudioName = null;
let agentAudioUrl = null;

let agentRecorder = null;
let agentChunks = [];
let agentTimer = null;
let agentSeconds = 0;


// ============================================================
// GENERAL HELPERS
// ============================================================

function formatTime(seconds) {

    const minutes = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");

    const secs = (seconds % 60)
        .toString()
        .padStart(2, "0");

    return `${minutes}:${secs}`;
}


function showStatus(
    elementId,
    message,
    type = ""
) {

    const element =
        document.getElementById(elementId);

    if (!element) return;

    element.textContent = message;

    element.className =
        `status-box ${type}`;

    element.classList.remove("hidden");
}


function isSupportedAudioFile(file) {

    if (!file) return false;

    const name =
        file.name.toLowerCase();

    return (
        name.endsWith(".wav") ||
        name.endsWith(".mp3")
    );
}


function getAudioType(name) {

    const lower =
        name.toLowerCase();

    if (lower.endsWith(".wav")) {
        return "audio/wav";
    }

    if (lower.endsWith(".mp3")) {
        return "audio/mpeg";
    }

    return "audio";
}


function revokeUrl(url) {

    if (url) {
        URL.revokeObjectURL(url);
    }
}


// ============================================================
// STT PAGE — MICROPHONE
// ============================================================

async function startRecording() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        showStatus(
            "sttStatus",
            "Microphone recording is not supported by this browser.",
            "error"
        );

        return;
    }


    try {

        const stream =
            await navigator.mediaDevices
                .getUserMedia({
                    audio: true
                });


        recordedChunks = [];


        // Browser recording format.
        // This is temporary and will be converted
        // to a REAL WAV file by FastAPI.
        let mimeType = "";

        if (
            MediaRecorder.isTypeSupported(
                "audio/webm;codecs=opus"
            )
        ) {

            mimeType =
                "audio/webm;codecs=opus";

        } else if (
            MediaRecorder.isTypeSupported(
                "audio/webm"
            )
        ) {

            mimeType =
                "audio/webm";
        }


        mediaRecorder = mimeType
            ? new MediaRecorder(
                stream,
                { mimeType }
            )
            : new MediaRecorder(stream);


        mediaRecorder.ondataavailable =
            event => {

                if (
                    event.data &&
                    event.data.size > 0
                ) {

                    recordedChunks.push(
                        event.data
                    );
                }
            };


        mediaRecorder.onstop =
            async () => {

                const webmBlob =
                    new Blob(
                        recordedChunks,
                        {
                            type:
                                mimeType ||
                                "audio/webm"
                        }
                    );


                stream
                    .getTracks()
                    .forEach(
                        track =>
                            track.stop()
                    );


                await convertMicrophoneRecording(
                    webmBlob,
                    "stt"
                );
            };


        mediaRecorder.start();


        document
            .getElementById("recordButton")
            .classList.add("hidden");

        document
            .getElementById("stopButton")
            .classList.remove("hidden");

        document
            .getElementById("recordingTimer")
            .classList.remove("hidden");


        recordingSeconds = 0;

        document
            .getElementById("recordingTimer")
            .textContent =
            formatTime(0);


        recordingTimer =
            setInterval(() => {

                recordingSeconds++;

                const timer =
                    document.getElementById(
                        "recordingTimer"
                    );

                if (timer) {
                    timer.textContent =
                        formatTime(
                            recordingSeconds
                        );
                }

            }, 1000);


        showStatus(
            "sttStatus",
            "Recording... Speak now. Stop when finished.",
            "working"
        );


    } catch (error) {

        console.error(error);

        showStatus(
            "sttStatus",
            "Microphone permission was denied or unavailable.",
            "error"
        );
    }
}


// ============================================================
// STT PAGE — STOP MICROPHONE
// ============================================================

function stopRecording() {

    if (
        !mediaRecorder ||
        mediaRecorder.state === "inactive"
    ) {
        return;
    }


    mediaRecorder.stop();

    clearInterval(
        recordingTimer
    );


    document
        .getElementById("recordButton")
        .classList.remove("hidden");

    document
        .getElementById("stopButton")
        .classList.add("hidden");

    document
        .getElementById("recordingTimer")
        .classList.add("hidden");


    showStatus(
        "sttStatus",
        "Converting recording to WAV...",
        "working"
    );
}


// ============================================================
// CONVERT MICROPHONE RECORDING
// ============================================================

async function convertMicrophoneRecording(
    webmBlob,
    target
) {

    const isAgent =
        target === "agent";

    const statusId =
        isAgent
            ? "agentStatus"
            : "sttStatus";


    showStatus(
        statusId,
        "Converting microphone recording to WAV...",
        "working"
    );


    const formData =
        new FormData();


    formData.append(
        "file",
        webmBlob,
        "microphone.webm"
    );


    try {

        const response =
            await fetch(
                "/api/convert-recording",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                "Audio conversion failed."
            );
        }


        // Download the REAL WAV generated
        // by the backend.
        const wavResponse =
            await fetch(
                data.path
            );


        if (!wavResponse.ok) {

            throw new Error(
                "Converted WAV file could not be loaded."
            );
        }


        const wavArrayBuffer =
            await wavResponse.arrayBuffer();


        // Explicitly mark this as WAV.
        // The bytes are already converted by the backend.
        const wavBlob =
            new Blob(
                [wavArrayBuffer],
                {
                    type: "audio/wav"
                }
            );


        if (isAgent) {

            agentAudioBlob =
                wavBlob;

            agentAudioName =
                "Microphone recording.wav";

            revokeUrl(
                agentAudioUrl
            );

            agentAudioUrl =
                URL.createObjectURL(
                    wavBlob
                );


            displayAgentAudio(
                wavBlob,
                agentAudioName,
                agentAudioUrl
            );


            showStatus(
                "agentStatus",
                "Recording ready. Preview it before running the agent.",
                "success"
            );

        } else {

            selectedAudioBlob =
                wavBlob;

            selectedAudioName =
                "Microphone recording.wav";


            revokeUrl(
                selectedAudioUrl
            );

            selectedAudioUrl =
                URL.createObjectURL(
                    wavBlob
                );


            displaySelectedAudio(
                wavBlob,
                selectedAudioName,
                selectedAudioUrl
            );


            showStatus(
                "sttStatus",
                "Recording ready. Preview it before transcribing.",
                "success"
            );
        }


    } catch (error) {

        console.error(error);

        showStatus(
            statusId,
            error.message ||
            "Could not convert the recording to WAV.",
            "error"
        );
    }
}


// ============================================================
// STT PAGE — FILE UPLOAD
// ============================================================

function handleFileSelection(input) {

    const file =
        input.files[0];

    if (!file) return;


    if (!isSupportedAudioFile(file)) {

        input.value = "";

        showStatus(
            "sttStatus",
            "Only WAV and MP3 files are supported.",
            "error"
        );

        return;
    }


    selectedAudioBlob =
        file;

    selectedAudioName =
        file.name;


    revokeUrl(
        selectedAudioUrl
    );


    selectedAudioUrl =
        URL.createObjectURL(
            file
        );


    displaySelectedAudio(
        file,
        file.name,
        selectedAudioUrl
    );


    showStatus(
        "sttStatus",
        "Audio loaded. Preview it before transcribing.",
        "success"
    );
}


// ============================================================
// STT PAGE — DISPLAY SELECTED AUDIO
// ============================================================

function displaySelectedAudio(
    blob,
    name,
    url = null
) {

    const card =
        document.getElementById(
            "selectedAudioCard"
        );

    const player =
        document.getElementById(
            "audioPreview"
        );

    const audioName =
        document.getElementById(
            "audioName"
        );

    const audioMeta =
        document.getElementById(
            "audioMeta"
        );

    const transcribeButton =
        document.getElementById(
            "transcribeButton"
        );


    if (!card || !player) return;


    if (url) {
        player.src = url;
    }


    audioName.textContent =
        name;


    const sizeMB =
        (
            blob.size /
            (1024 * 1024)
        ).toFixed(2);


    const type =
        getAudioType(name);


    audioMeta.textContent =
        `${type} • ${sizeMB} MB`;


    card.classList.remove(
        "hidden"
    );


    if (transcribeButton) {
        transcribeButton.disabled =
            false;
    }
}


// ============================================================
// STT PAGE — REMOVE AUDIO
// ============================================================

function removeAudio() {

    selectedAudioBlob = null;
    selectedAudioName = null;


    revokeUrl(
        selectedAudioUrl
    );

    selectedAudioUrl = null;


    const card =
        document.getElementById(
            "selectedAudioCard"
        );

    if (card) {
        card.classList.add(
            "hidden"
        );
    }


    const button =
        document.getElementById(
            "transcribeButton"
        );

    if (button) {
        button.disabled = true;
    }


    const file =
        document.getElementById(
            "audioFile"
        );

    if (file) {
        file.value = "";
    }


    const player =
        document.getElementById(
            "audioPreview"
        );

    if (player) {

        player.pause();

        player.removeAttribute(
            "src"
        );

        player.load();
    }


    const result =
        document.getElementById(
            "transcriptionCard"
        );

    if (result) {
        result.classList.add(
            "hidden"
        );
    }
}


// ============================================================
// STT PAGE — RECORD AGAIN
// ============================================================

function recordAgain() {

    removeAudio();


    setTimeout(
        () => {
            startRecording();
        },
        150
    );
}


// ============================================================
// STT — TRANSCRIBE
// ============================================================

async function transcribeSelectedAudio() {

    if (!selectedAudioBlob) {
        return;
    }


    const button =
        document.getElementById(
            "transcribeButton"
        );


    button.disabled = true;

    button.textContent =
        "Transcribing...";


    showStatus(
        "sttStatus",
        "Converting speech to text...",
        "working"
    );


    const formData =
        new FormData();


    formData.append(
        "file",
        selectedAudioBlob,
        selectedAudioName ||
        "recording.wav"
    );


    try {

        const response =
            await fetch(
                "/api/stt",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        if (!data.success) {

            showStatus(
                "sttStatus",
                data.message ||
                "No clear speech was detected.",
                "error"
            );

            return;
        }


        document
            .getElementById(
                "transcriptionResult"
            )
            .textContent =
            data.transcription;


        document
            .getElementById(
                "transcriptionCard"
            )
            .classList.remove(
                "hidden"
            );


        showStatus(
            "sttStatus",
            "✓ Transcription completed",
            "success"
        );


    } catch (error) {

        console.error(error);

        showStatus(
            "sttStatus",
            "Unable to process the audio.",
            "error"
        );


    } finally {

        button.disabled = false;

        button.textContent =
            "Transcribe Audio";
    }
}


// ============================================================
// TTS PAGE
// ============================================================

function updateRate(value) {

    const rateValue =
        document.getElementById(
            "rateValue"
        );

    if (rateValue) {
        rateValue.textContent =
            value;
    }
}


async function generateSpeech() {

    const text =
        document
            .getElementById(
                "ttsText"
            )
            .value
            .trim();


    const voice =
        document
            .getElementById(
                "voiceSelect"
            )
            .value;


    const rate =
        document
            .getElementById(
                "rate"
            )
            .value;


    if (!text) {

        showStatus(
            "ttsStatus",
            "Please enter some text first.",
            "error"
        );

        return;
    }


    const button =
        document.getElementById(
            "generateButton"
        );


    button.disabled = true;

    button.textContent =
        "Generating...";


    showStatus(
        "ttsStatus",
        "Converting text into speech...",
        "working"
    );


    const formData =
        new FormData();


    formData.append(
        "text",
        text
    );

    formData.append(
        "voice_id",
        voice
    );

    formData.append(
        "rate",
        rate
    );


    try {

        const response =
            await fetch(
                "/api/tts",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        if (!data.success) {

            showStatus(
                "ttsStatus",
                data.message ||
                "Unable to generate speech.",
                "error"
            );

            return;
        }


        const player =
            document.getElementById(
                "ttsPlayer"
            );


        player.src =
            data.audio_url;

        player.load();


        document
            .getElementById(
                "ttsResult"
            )
            .classList.remove(
                "hidden"
            );


        showStatus(
            "ttsStatus",
            "✓ Speech generated successfully",
            "success"
        );


    } catch (error) {

        console.error(error);

        showStatus(
            "ttsStatus",
            "Unable to generate speech.",
            "error"
        );


    } finally {

        button.disabled = false;

        button.textContent =
            "Generate Speech";
    }
}


// ============================================================
// AGENT PAGE — OPEN RECORDER
// ============================================================

function openAgentRecorder() {

    const recorder =
        document.getElementById(
            "agentRecorder"
        );

    if (recorder) {
        recorder.classList.remove(
            "hidden"
        );
    }


    const card =
        document.getElementById(
            "agentAudioCard"
        );

    if (card) {
        card.classList.add(
            "hidden"
        );
    }
}


// ============================================================
// AGENT PAGE — MICROPHONE
// ============================================================

async function startAgentRecording() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        showStatus(
            "agentStatus",
            "Microphone recording is not supported by this browser.",
            "error"
        );

        return;
    }


    try {

        const stream =
            await navigator.mediaDevices
                .getUserMedia({
                    audio: true
                });


        agentChunks = [];


        let mimeType = "";

        if (
            MediaRecorder.isTypeSupported(
                "audio/webm;codecs=opus"
            )
        ) {

            mimeType =
                "audio/webm;codecs=opus";

        } else if (
            MediaRecorder.isTypeSupported(
                "audio/webm"
            )
        ) {

            mimeType =
                "audio/webm";
        }


        agentRecorder = mimeType
            ? new MediaRecorder(
                stream,
                { mimeType }
            )
            : new MediaRecorder(stream);


        agentRecorder.ondataavailable =
            event => {

                if (
                    event.data &&
                    event.data.size > 0
                ) {

                    agentChunks.push(
                        event.data
                    );
                }
            };


        agentRecorder.onstop =
            async () => {

                const webmBlob =
                    new Blob(
                        agentChunks,
                        {
                            type:
                                mimeType ||
                                "audio/webm"
                        }
                    );


                stream
                    .getTracks()
                    .forEach(
                        track =>
                            track.stop()
                    );


                await convertMicrophoneRecording(
                    webmBlob,
                    "agent"
                );
            };


        agentRecorder.start();


        document
            .getElementById(
                "agentRecordButton"
            )
            .classList.add(
                "hidden"
            );


        document
            .getElementById(
                "agentStopButton"
            )
            .classList.remove(
                "hidden"
            );


        agentSeconds = 0;


        const timer =
            document.getElementById(
                "agentTimer"
            );

        if (timer) {

            timer.classList.remove(
                "hidden"
            );

            timer.textContent =
                formatTime(0);
        }


        agentTimer =
            setInterval(
                () => {

                    agentSeconds++;

                    if (timer) {
                        timer.textContent =
                            formatTime(
                                agentSeconds
                            );
                    }

                },
                1000
            );


        showStatus(
            "agentStatus",
            "Recording... Speak now. Stop when finished.",
            "working"
        );


    } catch (error) {

        console.error(error);

        showStatus(
            "agentStatus",
            "Microphone permission was denied or unavailable.",
            "error"
        );
    }
}


// ============================================================
// AGENT PAGE — STOP
// ============================================================

function stopAgentRecording() {

    if (
        !agentRecorder ||
        agentRecorder.state === "inactive"
    ) {
        return;
    }


    agentRecorder.stop();

    clearInterval(
        agentTimer
    );


    document
        .getElementById(
            "agentRecordButton"
        )
        .classList.remove(
            "hidden"
        );


    document
        .getElementById(
            "agentStopButton"
        )
        .classList.add(
            "hidden"
        );


    const timer =
        document.getElementById(
            "agentTimer"
        );

    if (timer) {
        timer.classList.add(
            "hidden"
        );
    }


    showStatus(
        "agentStatus",
        "Converting recording to WAV...",
        "working"
    );
}


// ============================================================
// AGENT PAGE — FILE UPLOAD
// ============================================================

function handleAgentFile(input) {

    const file =
        input.files[0];

    if (!file) return;


    if (!isSupportedAudioFile(file)) {

        input.value = "";

        showStatus(
            "agentStatus",
            "Only WAV and MP3 files are supported.",
            "error"
        );

        return;
    }


    agentAudioBlob =
        file;

    agentAudioName =
        file.name;


    revokeUrl(
        agentAudioUrl
    );


    agentAudioUrl =
        URL.createObjectURL(
            file
        );


    displayAgentAudio(
        file,
        file.name,
        agentAudioUrl
    );


    showStatus(
        "agentStatus",
        "Audio loaded. Preview it before running the agent.",
        "success"
    );
}


// ============================================================
// AGENT PAGE — DISPLAY AUDIO
// ============================================================

function displayAgentAudio(
    blob,
    name,
    url = null
) {

    const card =
        document.getElementById(
            "agentAudioCard"
        );

    const player =
        document.getElementById(
            "agentAudioPreview"
        );

    const nameElement =
        document.getElementById(
            "agentAudioName"
        );

    const meta =
        document.getElementById(
            "agentAudioMeta"
        );

    const button =
        document.getElementById(
            "runAgentButton"
        );


    if (!card || !player) {
        return;
    }


    if (url) {
        player.src = url;
    }


    nameElement.textContent =
        name;


    const sizeMB =
        (
            blob.size /
            (1024 * 1024)
        ).toFixed(2);


    const type =
        getAudioType(name);


    meta.textContent =
        `${type} • ${sizeMB} MB`;


    card.classList.remove(
        "hidden"
    );


    if (button) {
        button.disabled = false;
    }
}


// ============================================================
// AGENT PAGE — REMOVE AUDIO
// ============================================================

function removeAgentAudio() {

    agentAudioBlob = null;
    agentAudioName = null;


    revokeUrl(
        agentAudioUrl
    );

    agentAudioUrl = null;


    const card =
        document.getElementById(
            "agentAudioCard"
        );

    if (card) {
        card.classList.add(
            "hidden"
        );
    }


    const button =
        document.getElementById(
            "runAgentButton"
        );

    if (button) {
        button.disabled = true;
    }


    const file =
        document.getElementById(
            "agentFile"
        );

    if (file) {
        file.value = "";
    }


    const player =
        document.getElementById(
            "agentAudioPreview"
        );

    if (player) {

        player.pause();

        player.removeAttribute(
            "src"
        );

        player.load();
    }


    const results =
        document.getElementById(
            "agentResults"
        );

    if (results) {
        results.classList.add(
            "hidden"
        );
    }
}


// ============================================================
// AGENT — RECORD AGAIN
// ============================================================

function recordAgentAgain() {

    removeAgentAudio();


    setTimeout(
        () => {

            openAgentRecorder();

            startAgentRecording();

        },
        150
    );
}


// ============================================================
// AGENT — RUN COMPLETE PIPELINE
// ============================================================

async function runVoiceAgent() {

    if (!agentAudioBlob) {
        return;
    }


    const button =
        document.getElementById(
            "runAgentButton"
        );


    button.disabled = true;

    button.textContent =
        "Processing...";


    showStatus(
        "agentStatus",
        "Running STT → Response → TTS...",
        "working"
    );


    const formData =
        new FormData();


    formData.append(
        "file",
        agentAudioBlob,
        agentAudioName ||
        "recording.wav"
    );


    try {

        const response =
            await fetch(
                "/api/agent",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        if (!data.success) {

            showStatus(
                "agentStatus",
                data.message ||
                "Unable to run the voice agent.",
                "error"
            );

            return;
        }


        document
            .getElementById(
                "agentTranscription"
            )
            .textContent =
            data.transcription;


        document
            .getElementById(
                "agentResponse"
            )
            .textContent =
            data.response;


        const player =
            document.getElementById(
                "agentOutputPlayer"
            );


        player.src =
            data.audio_url;

        player.load();


        document
            .getElementById(
                "agentResults"
            )
            .classList.remove(
                "hidden"
            );


        showStatus(
            "agentStatus",
            "✓ Complete: STT → Response → TTS",
            "success"
        );


    } catch (error) {

        console.error(error);

        showStatus(
            "agentStatus",
            "Unable to run the voice agent.",
            "error"
        );


    } finally {

        button.disabled = false;

        button.textContent =
            "Run Voice Agent";
    }
}