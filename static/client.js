var loc = window.location;
const HOSTURL = `${loc.protocol}//${loc.hostname}:${loc.port}`;

var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioStream;
var recorder;
var periodicAnalysisTimer;

function startRecording() {
    $('#display .record_button').text("Recording..");
    navigator.mediaDevices.getUserMedia({audio: true, video: false}).then(function(stream) {
        var audioContext = new AudioContext();
        audioStream = stream;
        var audioInput = audioContext.createMediaStreamSource(stream);
        recorder = new Recorder(audioInput, {numChannels:1});
        recorder.record();
        console.log('recording started...');
    }).catch(err => {
        console.log('recording failed...', err);
        backToInitialState();
    });
}

function stopRecording() {
    recorder.stop();
    audioStream.getAudioTracks()[0].stop(); // microphone access
    recorder.exportWAV(uploadAudio);
}

function uploadAudio(blob) {
    $('#display .record_button').text("Recording..");
    var audioData = new FormData();
    audioData.append('file', blob, 'test.wav');
    $.ajax({
        url: `${HOSTURL}/analyze`,
        type: 'POST',
        data: audioData,
        processData: false,
        contentType: false,
        success: function(response) {
            console.log('uploadAudio()', response);

            timenow = moment().format('MMMM Do, h:mm:ss a'); 
            crystatus = response['crying'] ? "Crying" : "Not Crying"
            $("#results").append(`<p> ${timenow} ${crystatus} </p>`)
            $('#display .record_button').text('STOP');
        },
        error: function(response) {
            $('#try_again').html("ERROR");
        }
    });
}

function recordClipAndAnalyze(clipLengthMs) {

    startRecording()
    console.log("Clip length", clipLengthMs)

    // After the given time, stop the recording and send for analysis
    setTimeout(function() {

        stopRecording()

    }, clipLengthMs)
}

function periodicAnalysis() {

    clipLengthMs = 5 * 1000  // 5 seconds
    periodMs = 6 * 1000  // 6 seconds

    recordClipAndAnalyze(clipLengthMs)

    // After the given period, reload the browser automatically
    setTimeout(function() {
        window.location.reload(true);
    }, periodMs)
}

function cancelPeriodicAnalysis() {
    console.log("Stopping Periodic Analysis..")
    periodicAnalysisTimer && clearInterval(periodicAnalysisTimer)
    $("#display").html(htmlForRecord())
}

function startPeriodicAnalysis() {
    console.log("Starting Periodic Analysis..")
    if(!periodicAnalysisTimer) {
        periodicAnalysis()
        $("#display").html(cancelPeriodicAnalysisHtml())
    }
}

// Automatically start the analysis
startPeriodicAnalysis()

function htmlForRecord() {
    return "<button class=\"record_button\" type=\"button\" onclick=\"startPeriodicAnalysis()\">START</button>";
}

function cancelPeriodicAnalysisHtml() {
    return "<button class=\"record_button\" type=\"button\" onclick=\"cancelPeriodicAnalysis()\">STOP</button>";
}

function htmlForAnalyzing() {
    return "<button class=\"record_button\" type=\"button\">Analyzing...</button>";
}