// import 'jquery/jquery-3.6.0.js';

const timesRowWidthMultiplier = 0.08;

var startTime = 8; // 6:30 am
var endTime = 16; // 4:20 pm

var startInt;
var endInt;

var classes = {};

// this function should be run to redraw the page
function draw() {

    const viewWidth = $('#viewcontainer').width();
    const viewHeight = $('#viewcontainer').height();

    // set all row heights
    $('.row').css('height', viewHeight);

    // set times row width
    $('.timesrow').css('width', viewWidth * timesRowWidthMultiplier);

    // set day row widths
    const numOfDays = $('.dayrow').length;
    $('.dayrow').css('width', viewWidth * (1-timesRowWidthMultiplier) / numOfDays);
    
    // set content column height
    const heightOfRowTotal = $('.dayrow').height();
    const heightOfRowTitle = $('.dayrow .title').outerHeight();
    $('.dayrow .content').css('height', heightOfRowTotal - heightOfRowTitle);

    // empty content to prepare for drawing
    $('.dayrow .content').empty();
    $('.timesrow .content').empty();

    // draw internal boxes
    const numOfTimeBoxes = endInt - startInt;
    var timeBox = $('<div></div>');
    var timeBox = timeBox.addClass('timebox');
    for (var i = 0; i < numOfTimeBoxes; i++) {
        $('.dayrow .content').append(timeBox.clone());
    }

    // set timebox height
    const heightOfContentBox = $('.dayrow .content').outerHeight();
    $('.dayrow .content .timebox').css('height', heightOfContentBox / numOfTimeBoxes);

    // TIMEROW
    // set timerow title box height
    $('.timesrow .title').css('height', heightOfRowTitle);
    $('.timesrow .content').css('height', heightOfContentBox);

    for (var i = startInt; i < endInt + 1; i++) {
        var timeLabel = $('<div></div>');
        timeLabel = timeLabel.text(timeLabelFromInt(i));
        timeLabel = timeLabel.addClass('timelabel');
        $('.timesrow .content').append(timeLabel);
    }

    // set timebox height
    $('.timesrow .content .timelabel').css('height', heightOfContentBox / numOfTimeBoxes);
    $('.timesrow .content .timelabel').last().css('height', 0);
}

// determine the start and end integer cutoffs
function calculateInterval() {
    startInt = Math.floor(startTime);
    endInt = Math.ceil(endTime);

    if (Math.abs(startInt - startTime) < 0.2) {
        startInt -= 1;
    } 
    if (Math.abs(endInt - endTime) < 0.2) {
        endInt += 1;
    }
}

function timeLabelFromInt(timeInt) {
    var pm = false;
    if (timeInt > 12) {
        timeInt -= 12;
        pm = true;
    }
    var timeString = `${timeInt}:00 ` + (pm ? 'PM' : 'AM');
    return timeString;
}

function updateTimeIntervals(start, end) {
    startTime = start;
    endTime = end;
    calculateInterval();
    draw();
}

function parseTimeStringToDecimal(timeString) {
    const parsingRegex = /^(?<hours>\d{1,2}):(?<minutes>\d{2})[ ]*(?<ending>(AM|PM))$/i;
    var match = parsingRegex.exec(timeString);
    var hours = match.groups.hours;
    var minutes = match.groups.minutes;
    var ending = match.groups.ending;

    var time = parseInt(hours);
    time += (parseInt(minutes) / 60);
    if (ending.toLowerCase() == 'pm') {
        time += 12;
    }
    return time;
}

function loadClassInfo() {
    var jsonClassInfo = window.localStorage.getItem('classes');
    if (jsonClassInfo == null) {
        classes = {};
    } else {
        classes = JSON.parse(jsonClassInfo);
    }
}

function saveClassInfo() {
    var jsonClassInfo = JSON.stringify(classes);
    window.localStorage.setItem('classes', jsonClassInfo);
}

// redraw the page when the window size changes
$(window).on('resize', function () {
    draw();
});

$('#addClassButton').on('click', function () {
    $('#addClassModal').modal('show');
});

$('#addClassForm').on('submit', function (event) {
    event.preventDefault();

    var classInfo = {};
    classInfo.displayName = $('#addClassDisplayName').val();
    classInfo.startTime = parseTimeStringToDecimal($('#addClassStartTime').val());
    classInfo.endTime = parseTimeStringToDecimal($('#addClassEndTime').val());
    classInfo.days = [false, false, false, false, false];
    classInfo.days[0] = $('#addClassDayMonday').is(':checked');
    classInfo.days[1] = $('#addClassDayTuesday').is(':checked');
    classInfo.days[2] = $('#addClassDayWednesday').is(':checked');
    classInfo.days[3] = $('#addClassDayThursday').is(':checked');
    classInfo.days[4] = $('#addClassDayFriday').is(':checked');

    var classID = $('#addClassClassID').val();
    classes[classID] = classInfo;
    saveClassInfo();

    $('#addClassModal').modal('hide');
});

// starting info for creating the app
loadClassInfo();
calculateInterval();
draw();