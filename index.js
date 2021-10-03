// import 'jquery/jquery-3.6.0.js';

const timesRowWidthMultiplier = 0.08;

var startTime = null;
var endTime = null;

var startInt;
var endInt;

var classes = {};
var schedules = {};
var currentSchedule = '';

var settings = {};

var mobileWarningModalShown = false;

const defaultScheduleName = 'Untitled Schedule';

// this function should be run to redraw the page
function draw() {

    const viewWidth = $('#viewcontainer').width();
    const viewHeight = $('#viewcontainer').height();

    // set all row heights
    $('.dayrow').css('height', viewHeight);
    $('.timesrow').css('height', viewHeight);

    // set times row width
    $('.timesrow').css('width', viewWidth * timesRowWidthMultiplier);

    // hide or show day columns depending on settings
    var numOfDays = 0;
    numOfDays += setRowVisibility(settings.daysEnabled[0], '#dayrowSunday');
    numOfDays += setRowVisibility(settings.daysEnabled[1], '#dayrowMonday');
    numOfDays += setRowVisibility(settings.daysEnabled[2], '#dayrowTuesday');
    numOfDays += setRowVisibility(settings.daysEnabled[3], '#dayrowWednesday');
    numOfDays += setRowVisibility(settings.daysEnabled[4], '#dayrowThursday');
    numOfDays += setRowVisibility(settings.daysEnabled[5], '#dayrowFriday');
    numOfDays += setRowVisibility(settings.daysEnabled[6], '#dayrowSaturday');

    // set day row widths
    $('.dayrow').css('width', viewWidth * (1-timesRowWidthMultiplier) / numOfDays);
    
    // set content column height
    const heightOfRowTotal = $('.dayrow').height();
    const heightOfRowTitle = $('.dayrow:visible .title').outerHeight();
    $('.dayrow .content').css('height', heightOfRowTotal - heightOfRowTitle);

    // set last row border
    $('.dayrow:visible').last().children('.content').css('border-right', '1px solid gray');

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

    if (classes == null) {
        schedules[defaultScheduleName] = {};
        setCurrentSchedule(defaultScheduleName);
    }
    for (const classID in classes) {
        const classInfo = classes[classID];
        
        // calculate height
        const classBoxHeight = (classInfo.endTime - classInfo.startTime) * timeboxHeight;

        // calculate height offset
        const topOffset = (classInfo.startTime - startInt) * timeboxHeight;
        const bottomOffset = heightOfContentBox - topOffset;

        // create classBox element
        var classBox = $('<div></div>');
        classBox.data('class-id', classID);
        classBox.addClass('class-box');
        classBox.css('height', classBoxHeight);
        classBox.addClass('custombg-' + classInfo.color);
        classBox.css('z-index', Math.round(99 - classBoxHeight / 10));

        // create title element
        var cbDisplayName = $('<div></div>');
        cbDisplayName.addClass('class-box-title');
        cbDisplayName.text(classInfo.displayName);
        classBox.append(cbDisplayName);

        // create subtitle element
        var cbClassID = $('<div></div>');
        cbClassID.addClass('class-box-subtitle');
        cbClassID.text(classID);
        classBox.append(cbClassID);

        // create time element
        var cbTime = $('<div></div>');
        cbTime.addClass('class-box-subtitle');
        cbTime.text(parseDecimalTimeToString(classInfo.startTime, false) + ' - ' + parseDecimalTimeToString(classInfo.endTime, false));
        classBox.append(cbTime);

        // draw classBox
        for (var i = 0; i < 7; i++) {

            if (classInfo.days[i]) {
                var clone = classBox.clone();
                // register classBox onclick
                clone = clone.on('click', function() {
                    editClass(classID);
                });

                $(`.dayrow .content`).eq(i).append(clone);

                // get total heights of all classBoxes on top of it (in the dom), and add their height to the offset
                var prevSiblings = clone.prevAll('.class-box');
                var totalHeight = 0;
                for (var k = 0; k < prevSiblings.length; k++) {
                    var sibling = prevSiblings.eq(k);
                    totalHeight += sibling.outerHeight();
                }

                clone.css('top', -1 * bottomOffset - totalHeight);

                // set class based on children height
                var totalChildrenHeight = 0;
                clone.children().each(function(){
                    totalChildrenHeight += $(this).outerHeight(true);
                });

                totalClassBoxHeight = clone.outerHeight(true);

                if (totalClassBoxHeight - totalChildrenHeight < 20) {
                    clone.addClass('small');

                    totalChildrenHeight = 0;
                    clone.children().each(function(){
                        totalChildrenHeight += $(this).outerHeight(true);
                    });

                    if (totalClassBoxHeight - totalChildrenHeight < 10) {
                        clone.removeClass('small');
                        clone.addClass('very-small');
                    }
                }
            }
        }
    }
}

// determine the start and end integer cutoffs
function calculateInterval() {
    // reset start and end time
    startTime = null;
    endTime = null;
    startInt = null;
    endInt = null;

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

function setRowVisibility(bool, id) {
    if (bool) {
        $(id).show();
        $(id).addClass('dayrow-visible');
        return 1;
    } else {
        $(id).hide();
        $(id).removeClass('dayrow-visible');
        return 0;
    }
}

function schedulesLength() {
    var length = 0;
    for (const key in schedules) {
        if (schedules[key] != null) {
            length++;
        }
    }
    return length;
}

function timeLabelFromInt(timeInt) {
    var pm = false;
    if (timeInt > 12) {
        timeInt -= 12;
        pm = true;
    }
    if (timeInt == 12) {
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
    if (ending.toLowerCase() == 'pm' && hours < 12) {
        time += 12;
    }
    return time;
}

function parseDecimalTimeToString(time, useSpaces = true) {
    var hours = Math.floor(time);
    var minutes = Math.round((time - hours) * 60);

    pm = false;
    if (hours > 12) {
        hours -= 12;
        pm = true;
    }

    if (hours == 12) {
        pm = true;
    }

    var hoursString = hours.toString();
    var minutesString = minutes.toString();
    while (minutesString.length < 2) {
        minutesString = '0' + minutesString;
    }
    return `${hoursString}:${minutesString}${( useSpaces ? ' ' : '' )}${( pm ? 'PM' : 'AM' )}`;
}

function loadClassInfo() {
    var jsonSchedulesInfo = window.localStorage.getItem('schedules');
    currentSchedule = window.localStorage.getItem('currentSchedule');

    if (jsonSchedulesInfo == null) {
        schedules = {};
        schedules[defaultScheduleName] = {};
    } else {
        schedules = JSON.parse(jsonSchedulesInfo);
    }

    if (currentSchedule == null) {
        currentSchedule = defaultScheduleName;
    }

    // set classes
    classes = schedules[currentSchedule];
}

function loadSettings() {

    // days
    settings.daysEnabled = [false, false, false, false, false, false, false];
    settings.daysEnabled[0] = getDefault(convertToBool(localStorage.getItem('settingsDaySunday')), false);
    settings.daysEnabled[1] = getDefault(convertToBool(localStorage.getItem('settingsDayMonday')), true);
    settings.daysEnabled[2] = getDefault(convertToBool(localStorage.getItem('settingsDayTuesday')), true);
    settings.daysEnabled[3] = getDefault(convertToBool(localStorage.getItem('settingsDayWednesday')), true);
    settings.daysEnabled[4] = getDefault(convertToBool(localStorage.getItem('settingsDayThursday')), true);
    settings.daysEnabled[5] = getDefault(convertToBool(localStorage.getItem('settingsDayFriday')), true);
    settings.daysEnabled[6] = getDefault(convertToBool(localStorage.getItem('settingsDaySaturday')), false);
}

function saveClassInfo() {
    schedules[currentSchedule] = classes;
    var jsonSchedulesInfo = JSON.stringify(schedules);
    window.localStorage.setItem('schedules', jsonSchedulesInfo);
    window.localStorage.setItem('currentSchedule', currentSchedule);
}

function saveSettings() {
    
    // days
    localStorage.setItem('settingsDaySunday', settings.daysEnabled[0]);
    localStorage.setItem('settingsDayMonday', settings.daysEnabled[1]);
    localStorage.setItem('settingsDayTuesday', settings.daysEnabled[2]);
    localStorage.setItem('settingsDayWednesday', settings.daysEnabled[3]);
    localStorage.setItem('settingsDayThursday', settings.daysEnabled[4]);
    localStorage.setItem('settingsDayFriday', settings.daysEnabled[5]);
    localStorage.setItem('settingsDaySaturday', settings.daysEnabled[6]);
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
    $('#editClassDaySunday').prop('checked', classInfo.days[0]);
    $('#editClassDayMonday').prop('checked', classInfo.days[1]);
    $('#editClassDayTuesday').prop('checked', classInfo.days[2]);
    $('#editClassDayWednesday').prop('checked', classInfo.days[3]);
    $('#editClassDayThursday').prop('checked', classInfo.days[4]);
    $('#editClassDayFriday').prop('checked', classInfo.days[5]);
    $('#editClassDaySaturday').prop('checked', classInfo.days[6]);

    hideHiddenDayOptions('editClass');

    // show modal
    $('#editClassModal').modal('show');
}

function hideHiddenDayOptions(prefix) {
    if (settings.daysEnabled[0]) {
        $(`#${prefix}DaySunday`).parent().show();
    } else {
        $(`#${prefix}DaySunday`).parent().hide();
    }
    if (settings.daysEnabled[1]) {
        $(`#${prefix}DayMonday`).parent().show();
    } else {
        $(`#${prefix}DayMonday`).parent().hide();
    }
    if (settings.daysEnabled[2]) {
        $(`#${prefix}DayTuesday`).parent().show();
    } else {
        $(`#${prefix}DayTuesday`).parent().hide();
    }
    if (settings.daysEnabled[3]) {
        $(`#${prefix}DayWednesday`).parent().show();
    } else {
        $(`#${prefix}DayWednesday`).parent().hide();
    }
    if (settings.daysEnabled[4]) {
        $(`#${prefix}DayThursday`).parent().show();
    } else {
        $(`#${prefix}DayThursday`).parent().hide();
    }
    if (settings.daysEnabled[5]) {
        $(`#${prefix}DayFriday`).parent().show();
    } else {
        $(`#${prefix}DayFriday`).parent().hide();
    }
    if (settings.daysEnabled[6]) {
        $(`#${prefix}DaySaturday`).parent().show();
    } else {
        $(`#${prefix}DaySaturday`).parent().hide();
    }
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

    var days = [false, false, false, false, false, false, false];
    days[0] = $(`#${prefix}DaySunday`).is(':checked');
    days[1] = $(`#${prefix}DayMonday`).is(':checked');
    days[2] = $(`#${prefix}DayTuesday`).is(':checked');
    days[3] = $(`#${prefix}DayWednesday`).is(':checked');
    days[4] = $(`#${prefix}DayThursday`).is(':checked');
    days[5] = $(`#${prefix}DayFriday`).is(':checked');
    days[6] = $(`#${prefix}DaySaturday`).is(':checked');

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

function verifyScheduleFile(fileContents) {
    var scheduleFileObject;
    var contents;

    // verify the contents can be parsed by json
    try {
        scheduleFileObject = JSON.parse(fileContents);
    } catch (error) {
        console.log('schedule file verification failed due to invalid json')
        return { success: false, contents: null };
    }

    // check for the schedule file name
    if (scheduleFileObject.name == null) {
        console.log('Schedule file did not contain schedule name');
        return { success: false, contents: null };
    }

    // check for schedule file classes property
    if (scheduleFileObject.classes == null) {
        console.log('Schedule file did not contain classes property');
        return { success: false, contents: null };
    } else {
        contents = scheduleFileObject.classes;
    }

    // if the object has no keys, accept it automatically
    if (Object.keys(contents).length == 0) {
        return { success: true, contents: scheduleFileObject };
    }

    // go through each key and verify that all the necessary properties exist and are of the correct type
    for (const classID in contents) {
        const classInfo = contents[classID];

        // verify display name
        if (classInfo.displayName == null || typeof(classInfo.displayName) != 'string') {
            console.log('display name verification failed');
            return { success: false, contents: null };
        }

        // verify start time
        if (classInfo.startTime == null || typeof(classInfo.startTime) != 'number') {
            console.log('start time verification failed');
            return { success: false, contents: null };
        }

        // verify end time
        if (classInfo.endTime == null || typeof(classInfo.endTime) != 'number') {
            console.log('end time verification failed');
            return { success: false, contents: null };
        }

        // verify days
        if (classInfo.days == null || !Array.isArray(classInfo.days) || !(classInfo.days.length >= 5 && classInfo.days.length <= 7)) {
            console.log('days verification failed');
            return { success: false, contents: null };
        }

        // verify days contents
        for (const value of classInfo.days) {
            if (typeof(value) != 'boolean') {
                console.log('days value verification failed');
                return { success: false, contents: null };
            }
        }

        // verify colors
        if (classInfo.color == null || typeof(classInfo.color) != 'string') {
            console.log('color verification failed');
            return { success: false, contents: null };
        }
    }

    // verification passed!
    return { success: true, contents: scheduleFileObject };
}

function parseNewScheduleName(newName) {
    // make sure the name isn't a duplicate
    while (schedules[newName] != null) {

        var match = newName.match(/^(?<characters>.*?)[ ]*\((?<digits>\d+)\)$/);

        // if newName ends in digits, increment the ending digits
        if (match != null) {
            var digits = parseInt(match.groups.digits);
            digits++;
            newName = match.groups.characters + ` (${digits})`;
        } else {
            newName = newName + ` (1)`;
        }
    }
    return newName;
}

function buildSchedulesModal () {
    // build schedules modal
    $('#viewSchedulesSchedulesList').empty(scheduleRow);

    for (const scheduleName in schedules) {

        // generate element
        const schedule = schedules[scheduleName];
        if (schedule == undefined) { continue; }
        var scheduleRow = $('#viewSchedulesScheduleRowTemplate').clone();
        scheduleRow.show();
        scheduleRow.prop('id', '');
        scheduleRow.children('.schedule-row').children('.schedule-name').text(scheduleName);
        scheduleRow.children('.schedule-row').children('.schedule-name').data('name', scheduleName);
        if (scheduleName == currentSchedule) {
            scheduleRow.addClass('active');
        }

        // add to dom
        $('#viewSchedulesSchedulesList').append(scheduleRow);

        // ADD HANDLERS
        // schedule name
        scheduleRow.children('.schedule-row').children('.schedule-name').on('blur', function (event) {
            var newName = $(this).text();
            var oldName = $(this).data('name');

            if (newName == oldName) { return; } else {
                newName = parseNewScheduleName(newName);
                // change schedule name
                schedules[newName] = schedules[oldName];
                $(this).data('name', newName);
                $(this).text(newName);
                schedules[oldName] = undefined;
                if (currentSchedule == oldName) { // if the changed schedule was the active schedule
                    setCurrentSchedule(newName);
                } else { // if the changed schedule was not the active schedule
                    buildSchedulesModal();
                }
            }
        });
        scheduleRow.children('.schedule-row').children('.schedule-name').on('mouseover', function () {
            scheduleRow.children('.schedule-row').children('.schedule-name').prop('contenteditable', true);
            scheduleRow.data('clicks-disabled', true)
        });
        scheduleRow.children('.schedule-row').children('.schedule-name').on('mouseout', function () {
            scheduleRow.children('.schedule-row').children('.schedule-name').prop('contenteditable', false);
            scheduleRow.data('clicks-disabled', false)
        });

        // download button
        scheduleRow.children('.schedule-row').children('.schedule-icon-download').on('click', function () {

            // get json repesentation of schedule
            var exportedScheduleObject = {
                name: scheduleName,
                classes: schedules[scheduleName]
            };
            const jsonClasses = JSON.stringify(exportedScheduleObject);

            var blob = new Blob([jsonClasses], {type: 'application/json;charset=utf-8'});
            saveAs(blob, `${scheduleName}.schedule`);
        });
        scheduleRow.children('.schedule-row').children('.schedule-icon-download').on('mouseover', function () {
            scheduleRow.data('clicks-disabled', true)
        });
        scheduleRow.children('.schedule-row').children('.schedule-icon-download').on('mouseout', function () {
            scheduleRow.data('clicks-disabled', false)
        });

        // remove button
        scheduleRow.children('.schedule-row').children('.schedule-icon-delete').on('click', function () {
            var confirmResponse = confirm('Are you sure you want to delete this schedule? This cannot be undone.');

            if (!confirmResponse) { return; }

            schedules[scheduleName] = undefined;
            delete schedules[scheduleName];

            // was this schedule the active schedule
            if (currentSchedule == scheduleName) {
                // if the schedule was the last schedule, then add a new default schedule and set it as the current schedule
                if (schedulesLength() == 0) {
                    schedules[defaultScheduleName] = {};
                    setCurrentSchedule(defaultScheduleName);
                    return;
                }
                
                // otherwise, set the current schedule to the first schedule in the schedules list
                setCurrentSchedule(Object.keys(schedules)[0]);
            } else {
                buildSchedulesModal();
                saveClassInfo();
            }
        });
        scheduleRow.children('.schedule-row').children('.schedule-icon-delete').on('mouseover', function () {
            scheduleRow.data('clicks-disabled', true)
        });
        scheduleRow.children('.schedule-row').children('.schedule-icon-delete').on('mouseout', function () {
            scheduleRow.data('clicks-disabled', false)
        });

        // clicking the row itself
        scheduleRow.on('click', function () {
            if (!(scheduleRow.data('clicks-disabled'))) {
                setCurrentSchedule(scheduleName);
            }
        });
    }
}

function setCurrentSchedule(newScheduleName) {
    currentSchedule = newScheduleName;
    classes = schedules[currentSchedule];
    saveClassInfo();
    buildSchedulesModal();
    calculateInterval();
    draw();
}

function convertToBool(boolString) {
    switch (boolString) {
        case 'true':
            return true;
        case 'false':
            return false;
    }
}

function getDefault(value, defaultValue) {
    if (value == null) {
        return defaultValue;
    } else {
        return value;
    }
}

function checkMobileWarning() {
    const viewHeight = $(window).height();
    const viewWidth = $(window).width();

    if ((viewWidth < 1000 || viewHeight < 300) && !mobileWarningModalShown) {
        $('#mobileWarningModal').modal('show');
    }
}

// redraw the page when the window size changes
$(window).on('resize', function () {
    draw();
});

$('#addClassButton').on('click', function () {
    // reset form values
    $('#addClassDisplayName').val('');
    $('#addClassDisplayName').removeClass('is-invalid');
    $('#addClassClassID').val('');
    $('#addClassClassID').removeClass('is-invalid');
    $('#addClassStartTime').val('');
    $('#addClassStartTime').removeClass('is-invalid');
    $('#addClassEndTime').val('');
    $('#addClassEndTime').removeClass('is-invalid');
    $('#addClassDaySunday').prop('checked', false);
    $('#addClassDayMonday').prop('checked', false);
    $('#addClassDayTuesday').prop('checked', false);
    $('#addClassDayWednesday').prop('checked', false);
    $('#addClassDayThursday').prop('checked', false);
    $('#addClassDayFriday').prop('checked', false);
    $('#addClassDaySaturday').prop('checked', false);
    $('#addClassDayFeedback').hide();
    $('#addClassColor').val('blue');

    hideHiddenDayOptions('addClass');

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

$('#editClassRemoveButton').on('click', function(event) {
    event.preventDefault();

    var classID = $('#editClassOldClassID').val();

    var confirmResponse = confirm('Are you sure you want to delete this class?');
    if (!confirmResponse) { return; }

    delete classes[classID];

    $('#editClassModal').modal('hide');
    saveClassInfo();
    calculateInterval();
    draw();
});

$('#saveAsPNGButton').on('click', function() {
    $('#titlecontainer').hide();
    $('#scheduleNameContainer').children('.schedule-name').text(currentSchedule);
    $('#scheduleNameContainer').show();
    $('#controlscontainer').children().hide();
    html2canvas($('body')[0]).then((canvas) => {
        canvas.toBlob(function (blob) {
            saveAs(blob, currentSchedule + '.png');
            $('#scheduleNameContainer').hide();
            $('#titlecontainer').show();
            $('#controlscontainer').children().show();
        });
    });
});

$('#viewSchedulesButton').on('click', function () {
    buildSchedulesModal();
    $('#viewSchedulesModal').modal('show');
});

$('#viewSchedulesNewScheduleButton').on('click', function() {
    var newScheduleName = parseNewScheduleName(defaultScheduleName);
    schedules[newScheduleName] = {};
    setCurrentSchedule(newScheduleName);
});

$('#viewScheduleUploadScheduleButton').on('click', function () {
    $('#uploadScheduleFileInput').val('');
    $('#uploadScheduleFileInputFeedback').hide();
    $('#uploadScheduleUploadButton').addClass('disabled');
    $('#viewSchedulesModal').modal('hide');
    $('#uploadScheduleModal').modal('show');
});

$('#uploadScheduleFileInput').on('change', function () {
    var inputValue = $('#uploadScheduleFileInput').val();
    if (inputValue != "") {
        $('#uploadScheduleUploadButton').removeClass('disabled');
    }
});

$('#uploadScheduleUploadButton').on('click', function () {

    // verify that the button is not disabled
    var disabled = $('#uploadScheduleUploadButton').prop('disabled');
    if (disabled) { return; }

    // attempt to load and read file
    var inputFile = $('#uploadScheduleFileInput').prop('files')[0];
    if (inputFile != null) {
        var reader = new FileReader();
        reader.onload = function (evt) {
            // if file was successfully read
            const fileContents = evt.target.result;

            var {success, contents } = verifyScheduleFile(fileContents);
            if (!success) {
                $('#uploadScheduleFileInputFeedback').show();
                $('#uploadScheduleFileInputFeedback span').text('Invalid schedule file.');
            } else {

                var scheduleName = parseNewScheduleName(contents.name);
                var scheduleClasses = contents.classes;
                schedules[scheduleName] = scheduleClasses;
                setCurrentSchedule(scheduleName);
                saveClassInfo();
                calculateInterval();
                draw();
                $('#uploadScheduleModal').modal('hide');
                $('#viewSchedulesModal').modal('show');
            }
        }
        reader.onerror = function (evt) {
            $('#uploadScheduleFileInputFeedback').show();
            $('#uploadScheduleFileInputFeedback span').text('An error occurred while reading the file.');
        }
        reader.readAsText(inputFile);
    } else {
        $('#uploadScheduleFileInputFeedback').show();
        $('#uploadScheduleFileInputFeedback span').text('No file input detected.');
    }
});

$('#uploadScheduleModal').on('hide.bs.modal', function() {
    $('#viewSchedulesModal').modal('show');
});

$('#settingsButton').on('click', function () {
    // setup days
    $('#settingsDaySunday').prop('checked', settings.daysEnabled[0]);
    $('#settingsDayMonday').prop('checked', settings.daysEnabled[1]);
    $('#settingsDayTuesday').prop('checked', settings.daysEnabled[2]);
    $('#settingsDayWednesday').prop('checked', settings.daysEnabled[3]);
    $('#settingsDayThursday').prop('checked', settings.daysEnabled[4]);
    $('#settingsDayFriday').prop('checked', settings.daysEnabled[5]);
    $('#settingsDaySaturday').prop('checked', settings.daysEnabled[6]);

    $('#settingsModal').modal('show');
});

$('.settings-day').on('change', function(event) {
    var value = $(this).val();
    var checked = $(this).prop('checked');
    
    switch (value) {
        case 'sunday':
            settings.daysEnabled[0] = checked;
            break;
        case 'monday':
            settings.daysEnabled[1] = checked;
            break;
        case 'tuesday':
            settings.daysEnabled[2] = checked;
            break;
        case 'wednesday':
            settings.daysEnabled[3] = checked;
            break;
        case 'thursday':
            settings.daysEnabled[4] = checked;
            break;
        case 'friday':
            settings.daysEnabled[5] = checked;
            break;
        case 'saturday':
            settings.daysEnabled[6] = checked;
            break;
    }

    saveSettings();
    calculateInterval();
    draw();
});

$('#fullResetButton').on('click', function () {
    var confirmResponse = confirm('This will clear all schedules and reset all settings. Are you sure you want to continue?');

    if (!confirmResponse) { return; }

    $('#settingsModal').modal('hide');
    localStorage.clear();
    loadSettings();
    loadClassInfo();
    calculateInterval();
    draw();
});

// starting info for creating the app
loadSettings();
loadClassInfo();
calculateInterval();
draw();
setTimeout(checkMobileWarning, 1000);