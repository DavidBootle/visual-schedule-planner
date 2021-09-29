// import 'jquery/jquery-3.6.0.js';

const timesRowWidthMultiplier = 0.08;

var startTime = null;
var endTime = null;

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
    const timeboxHeight = heightOfContentBox / numOfTimeBoxes;
    $('.dayrow .content .timebox').css('height', timeboxHeight);

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
    $('.timesrow .content .timelabel').css('height', timeboxHeight);
    $('.timesrow .content .timelabel').last().css('height', 0);

    /* note that timeboxHeight is the unit for the number of pixels in an hour */
    // draw classes
    for (const classID in classes) {
        const classInfo = classes[classID];
        
        // calculate height
        const classBoxHeight = (classInfo.endTime - classInfo.startTime) * timeboxHeight;

        // calculate height offset
        const topOffset = (classInfo.startTime - startInt) * timeboxHeight;
        const bottomOffset = heightOfContentBox - topOffset;

        // create classBox element
        var classBox = $('<div></div>');
        classBox = classBox.data('class-id', classID);
        classBox = classBox.addClass('class-box');
        classBox = classBox.css('top', -1 * bottomOffset);
        classBox = classBox.css('height', classBoxHeight);
        classBox = classBox.addClass('custombg-' + classInfo.color);

        // draw classBox
        for (var i = 0; i < numOfDays; i++) {
            if (classInfo.days[i]) {
                var clone = classBox.clone();
                // register classBox onclick
                clone = clone.on('click', function() {
                    editClass(classID);
                });

                $(`.dayrow .content`).eq(i).append(clone);
            }
        }
    }
}

// determine the start and end integer cutoffs
function calculateInterval() {
    // calculate start and end time
    if (Object.keys(classes).length == 0) {
        startTime = 8;
        endTime = 16;
    } else {
        for (const classID in classes) {
            let classInfo = classes[classID];
            if (classInfo.startTime < startTime || startTime == null) {
                startTime = classInfo.startTime;
            }
            if (classInfo.endTime > endTime || endTime == null) {
                endTime = classInfo.endTime;
            }
        }
    }

    // get start and end int
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

    if (match == null) {
        return null;
    }

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

function parseDecimalTimeToString(time) {
    var hours = Math.floor(time);
    var minutes = Math.round((time - hours) * 60);

    pm = false;
    if (hours > 12) {
        hours -= 12;
        pm = true;
    }

    var hoursString = hours.toString();
    var minutesString = minutes.toString();
    while (minutesString.length < 2) {
        minutesString = '0' + minutesString;
    }

    return `${hoursString}:${minutesString} ${(pm ? 'PM' : 'AM' )}`;
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

function setPreviewBoxColor(prefix) {
    var colorOption = $(`#${prefix}Color`).val();
    $('.color-preview-box').attr('class', 'input-group-text color-preview-box custombg-' + colorOption);
}

function editClass(classID) {
    const classInfo = classes[classID];

    // update title
    $('#editClassModalTitle').text('Editing ' + classInfo.displayName);

    // update form values
    $('#editClassDisplayName').val(classInfo.displayName);
    $('#editClassClassID').val(classID);
    $('#editClassOldClassID').val(classID);
    $('#editClassStartTime').val( parseDecimalTimeToString(classInfo.startTime) );
    $('#editClassEndTime').val( parseDecimalTimeToString(classInfo.endTime) );
    $('#editClassColor').val( classInfo.color );
    setPreviewBoxColor('editClass');

    // update weekday checks
    $('#editClassDayMonday').prop('checked', classInfo.days[0]);
    $('#editClassDayTuesday').prop('checked', classInfo.days[1]);
    $('#editClassDayWednesday').prop('checked', classInfo.days[2]);
    $('#editClassDayThursday').prop('checked', classInfo.days[3]);
    $('#editClassDayFriday').prop('checked', classInfo.days[4]);

    // show modal
    $('#editClassModal').modal('show');
}

function parseClassInfo(prefix, editingMode) {
    var invalid = false;
    var classInfo = {};

    // validation
    var displayName = $(`#${prefix}DisplayName`).val();
    if (displayName.length == 0) {
        invalid = true;
        $(`#${prefix}DisplayName`).addClass('is-invalid');
    } else {
        $(`#${prefix}DisplayName`).removeClass('is-invalid');
    }

    var classID = $(`#${prefix}ClassID`).val();
    if (classes[classID] != null) {
        // disable duplication check when in editing mode (as the user can leave the id the same)
        if (!editingMode) {
            invalid = true;
            $(`#${prefix}ClassID`).addClass('is-invalid');
            $(`#${prefix}ClassIDFeedback`).text('This ID is already taken.');
        }
    }
    else if (classID.length == 0) {
        invalid = true;
        $(`#${prefix}ClassID`).addClass('is-invalid');
        $(`#${prefix}ClassIDFeedback`).text('Cannot be empty.');
    } else {
        $(`#${prefix}ClassID`).removeClass('is-invalid');
    }

    var startTime = parseTimeStringToDecimal($(`#${prefix}StartTime`).val());
    if (startTime == null) {
        invalid = true;
        $(`#${prefix}StartTime`).addClass('is-invalid');
    } else {
        $(`#${prefix}StartTime`).removeClass('is-invalid');
    }

    var endTime = parseTimeStringToDecimal($(`#${prefix}EndTime`).val());
    if (startTime == null) {
        invalid = true;
        $(`#${prefix}EndTime`).addClass('is-invalid');
    } else {
        $(`#${prefix}EndTime`).removeClass('is-invalid');
    }

    var days = [false, false, false, false, false];
    days[0] = $(`#${prefix}DayMonday`).is(':checked');
    days[1] = $(`#${prefix}DayTuesday`).is(':checked');
    days[2] = $(`#${prefix}DayWednesday`).is(':checked');
    days[3] = $(`#${prefix}DayThursday`).is(':checked');
    days[4] = $(`#${prefix}DayFriday`).is(':checked');

    var isAllFalse = days.every((value) => {
        return value == false;
    });
    if (isAllFalse) {
        invalid = true;
        $(`#${prefix}DayFeedback`).show();
    } else {
        $(`#${prefix}DayFeedback`).hide();
    }

    // put properties into one object
    classInfo.displayName = displayName;
    classInfo.startTime = startTime;
    classInfo.endTime = endTime;
    classInfo.days = days;
    classInfo.color = $(`#${prefix}Color`).val();

    return {
        classID: classID,
        classInfo: classInfo,
        invalid: invalid
    }
}

// redraw the page when the window size changes
$(window).on('resize', function () {
    draw();
});

$('#addClassButton').on('click', function () {
    $('#addClassModal').modal('show');
    setPreviewBoxColor('addClass');
});

$('#addClassForm').on('submit', function (event) {
    event.preventDefault();

    var {classID, classInfo, invalid} = parseClassInfo('addClass', false);
    
    if (!invalid) {
        classes[classID] = classInfo;
        saveClassInfo();

        $('#addClassModal').modal('hide');
        calculateInterval();
        draw();
    }
});

$('#editClassForm').on('submit', function (event) {
    event.preventDefault();

    var {classID, classInfo, invalid} = parseClassInfo('editClass', true);
    var oldClassID = $('#editClassOldClassID').val();

    if (!invalid) {
        if (classID != oldClassID) {
            delete classes[oldClassID];
        }
        classes[classID] = classInfo;
        saveClassInfo();
    
        $('#editClassModal').modal('hide');
        calculateInterval();
        draw();
    }
})

$('#addClassColor').on('change', function () {
    setPreviewBoxColor('addClass');
});

$('#editClassColor').on('change', function () {
    setPreviewBoxColor('editClass');
});

// starting info for creating the app
loadClassInfo();
calculateInterval();
draw();