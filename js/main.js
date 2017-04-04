/// REFERENCES (for auto-complete/IntelliSense)
/// <reference path="../typings/jquery.d.ts" />

/// GLOBALS
var animCanvas = document.getElementById("animCanvas");
var context = animCanvas.getContext("2d");
var last_time = null;

/// FUNCTIONS
function mainInit() {
    console.log("[DEBUG] mainInit() - begin");
    uiInit();
    animInit();
    animSetConfig(getConfigData());
    console.log("[DEBUG] mainInit() - end");
}

function uiInit() {
    console.log("[DEBUG] uiInit() - begin");

    // Initial button states - you can only start
    animationControlsLock(false, true, true, true);

    // Bind button actions
    $("#btnStart").click(startAnimation);
    $("#btnPause").click(pauseAnimation);
    $("#btnContinue").click(continueAnimation);
    $("#btnReset").click(resetAnimation);
    $("#btnGenerateQueueNew").click(function() { generateSeekPositions(true); });
    $("#btnGenerateQueueAppend").click(function () { generateSeekPositions(false); });

    // Hide alerts
    $("#alertAlgorithmError").hide();
    $("#alertQueueError").hide();

    // Fix input element values after changing focus
    $("#inputTrackSize").on("change", function() {
        var value = parseInt($("#inputTrackSize").val());
    
        if (isNaN(value) || value < 10)
            $("#inputTrackSize").val("10");
    });
    $("#inputGenerateCount").on("change", function() {
        var value = parseInt($("#inputGenerateCount").val());
    
        if (isNaN(value) || value < 0)
            $("#inputGenerateCount").val("0");
    });
    $("#inputStartingTrack").on("change", function() {
        var trackSize = parseInt($("#inputTrackSize").val());
        var value = parseInt($("#inputStartingTrack").val());
    
        if (isNaN(value) || value < 0)
            $("#inputStartingTrack").val("0");
        else if (!isNaN(trackSize) && value >= trackSize)
            $("#inputStartingTrack").val(trackSize - 1);
    });
    
    // Attach onConfigChange handler to input events of config controls
    $("#algorithmSelect").on("change", onConfigChange);
    $("#inputTrackSize").on("input", onConfigChange);
    $("#inputStartingTrack").on("input", onConfigChange);
    $("input[name='directionRadios']").on("change", onConfigChange);
    $("#inputSeekPositionQueue").on("input", onConfigChange);
    
    generateSeekPositions();

    console.log("[DEBUG] uiInit() - end");
}

// Starts new animation
function startAnimation() {
    console.log("[DEBUG] startAnimation() - begin");
    console.log("[DEBUG] startAnimation() - TrackSize: " + $("#inputTrackSize").val());

    // Hide previous alerts, so fade-in anim always play
    $("#alertAlgorithmError").hide();
    $("#alertQueueError").hide();

    // Lock configuration UI
    configurationLock(true);

    // Lock button states before handling state transition
    animationControlsLock(true, true, true, true);

    // Do data validation
    if (!validateAlgorithms())
    {
        // Enable queue error message
        $("#alertAlgorithmError").alert();
        $("#alertAlgorithmError").fadeIn();

        // Reset controls and unlock configuration 
        animationControlsLock(false, true, true, true);
        configurationLock(false);
        return;
    }
    
    if (!validateQueue()) {
        // Enable queue error message
        $("#alertQueueError").alert();
        $("#alertQueueError").fadeIn();

        // Reset controls and unlock configuration 
        animationControlsLock(false, true, true, true);
        configurationLock(false);
        return;
    }

    animSetConfig(getConfigData());
	animSetTime(0);
	animSetPaused(false);

    // Update button states
    animationControlsLock(true, false, true, false);
    console.log("[DEBUG] startAnimation() - end");
}

// Pauses animation
function pauseAnimation() {
    console.log("[DEBUG] pauseAnimation() - begin");

    // Lock button states before handling state transition
    animationControlsLock(true, true, true, true);

    animSetPaused(true);

    // Update button states
    animationControlsLock(true, true, false, false);
    console.log("[DEBUG] pauseAnimation() - end");
}

// Continues paused animation
function continueAnimation() {
    console.log("[DEBUG] continueAnimation() - begin");

    // Lock button states before handling state transition
    animationControlsLock(true, true, true, true);
    
    animSetPaused(false);
    
    // Update button states
    animationControlsLock(true, false, true, false);
    console.log("[DEBUG] continueAnimation() - end");
}

// Resets animation (so a new one can be started)
function resetAnimation() {
    console.log("[DEBUG] resetAnimation() - begin");

    // Lock button states before handling state transition
    animationControlsLock(true, true, true, true);

    // Update button states
    $("#btnStart").prop("disabled", false);
    $("#btnPause").prop("disabled", true);
    $("#btnContinue").prop("disabled", true);
    $("#btnReset").prop("disabled", true);
    
	animSetTime(0);
    animSetPaused(true);

    // Unlock configuration UI
    configurationLock(false);

    // Update button states
    animationControlsLock(false, true, true, true);
    console.log("[DEBUG] resetAnimation() - end");
}

// Lock/Disable or Unlock/Enable configuration inputs
function configurationLock(lock) {
    if (lock) {
        $("#algorithmSelect").prop("disabled", true);
        $("#algorithmSelect").selectpicker("refresh");
        $("#inputTrackSize").prop("disabled", true);
        $("#inputStartingTrack").prop("disabled", true);
        $("input[name='directionRadios']").prop("disabled", true);
        $("#inputSeekPositionQueueGenSelect").prop("disabled", true);
        $("#inputSeekPositionQueueGenSelect").selectpicker("refresh");
        $("#inputGenerateCount").prop("disabled", true);
        $("#btnGenerateQueueNew").prop("disabled", true);
        $("#btnGenerateQueueAppend").prop("disabled", true);
        $("#inputSeekPositionQueue").prop("disabled", true);
    } else {
        $("#algorithmSelect").prop("disabled", false);
        $("#algorithmSelect").selectpicker("refresh");
        $("#inputTrackSize").prop("disabled", false);
        $("#inputStartingTrack").prop("disabled", false);
        $("input[name='directionRadios']").prop("disabled", false);
        $("#inputSeekPositionQueueGenSelect").prop("disabled", false);
        $("#inputSeekPositionQueueGenSelect").selectpicker("refresh");
        $("#inputGenerateCount").prop("disabled", false);
        $("#btnGenerateQueueNew").prop("disabled", false);
        $("#btnGenerateQueueAppend").prop("disabled", false);
        $("#inputSeekPositionQueue").prop("disabled", false);
    }
}

// Lock/Disable/true or Unlock/Enable/false animation control buttons 
function animationControlsLock(lockStart, lockPause, lockContinue, lockReset) {
    $("#btnStart").prop("disabled", lockStart);
    $("#btnPause").prop("disabled", lockPause);
    $("#btnContinue").prop("disabled", lockContinue);
    $("#btnReset").prop("disabled", lockReset);
}

function generateSeekPositions(clearCurrent) {
    var mode = $("#inputSeekPositionQueueGenSelect").selectpicker("val");
    var genCount = $("#inputGenerateCount").val();
    var trackSize = $("#inputTrackSize").val();

    var positions = [];

    var newPos;
    var step;
    var backAndForthFlag = 0;

    // Generate array
    for (step = 0; step < genCount; step++) {
        if (mode == "unsorted") {
            newPos = Math.floor(Math.random() * trackSize);
            positions.push(newPos);
        } else if (mode == "sorted") {
            newPos = Math.floor(Math.random() * trackSize);
            positions.push(newPos);

            if (step + 1 >= genCount) {
                positions.sort(function(a, b) { return a - b; });
            }
        } else if (mode == "rsorted") {
            newPos = Math.floor(Math.random() * trackSize);
            positions.push(newPos);

            if (step + 1 >= genCount) {
                positions.sort(function(a, b) { return b - a; });
            }
        } else if (mode == "backnforth") {
            newPos = Math.floor(Math.random() * (trackSize / 2 - 1)) + (trackSize / 2) * backAndForthFlag;
            backAndForthFlag = ~backAndForthFlag & 1; // Flip bit
            positions.push(newPos);
        }
    }

    // Append array to queue input
    if ($("#inputSeekPositionQueue").val().trim().length > 0 && !clearCurrent) {
        $("#inputSeekPositionQueue").val(function() {
            return this.value + ", " + positions.join(", ");
        });
    } else {
        $("#inputSeekPositionQueue").val(function() {
            return positions.join(", ");
        });
    }
    
    onConfigChange();
}

function validateAlgorithms()
{
    var algorithms = $("#algorithmSelect").selectpicker("val");
    
    return (typeof algorithms !== 'undefined') && (algorithms.length > 0);
}

function validateQueue() {
    // Prepare for checks
    var trackSize = $("#inputTrackSize").val();
    var content = $("#inputSeekPositionQueue").val();
    content = content.replace(/\s+/g, "");
    content = content.replace(/,$/g, "");

    // Check format
    var re = new RegExp(/^\d+(,\d+)*$/);
    if (!re.test(content)) {
        return false;
    }

    // Check values
    var positions = content.split(",");
    var index;
    for (index = 0; index < positions.length; index++) {
        if (parseInt(positions[index]) > trackSize) {
            return false;
        }
    }

    return true;
}

// Returns simple JSON object of configuration data
function getConfigData() {
    var data = {};
    
    // Get algorithm selection
    // It is array of algorithm keywords:
    //  "fcfs" - FCFS (First Come, First Served)
    //  "sstf" - SSTF (Shortest Seek Time First)
    //  "scan" - Elevator (SCAN)
    //  "cscan" - Circular SCAN (C-SCAN)
    //  "look" - LOOK
    //  "clook" - C-LOOK
    data.algorithms = $("#algorithmSelect").selectpicker("val");

    // Fetch track size
    data.trackSize = parseInt($("#inputTrackSize").val());
    
    if (isNaN(data.trackSize) || data.trackSize < 10)
        data.trackSize = 10;

    // Fetch track starting position
    data.trackStart = parseInt($("#inputStartingTrack").val());
    
    if (isNaN(data.trackStart) || data.trackStart < 0)
        data.trackStart = 0;
    else if (data.trackStart >= data.trackSize)
        data.trackStart = data.trackSize - 1;
    
    // Selected direction [right/left]
    data.direction = parseInt($("input[name='directionRadios']:checked").val());

    // Queue
    data.seekQueue = [];
    
    if (validateQueue())
    {
        var queueInputValues = $("#inputSeekPositionQueue").val();
        queueInputValues = queueInputValues.replace(/\s+/g, "");
        queueInputValues = queueInputValues.replace(/,$/g, "");
        var positionStrings = queueInputValues.split(",");

        var index;
        for (index = 0; index < positionStrings.length; index++) {
            var pos = parseInt(positionStrings[index]);
            
            if (!isNaN(pos) && pos < data.trackSize) {
                data.seekQueue.push({
                    "index": index,
                    "pos": pos
                });
            }
        }
    }

    return data;
}

function onConfigChange() {
    animSetConfig(getConfigData());
}