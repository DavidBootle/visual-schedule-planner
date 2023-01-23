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

/**
 * The draw function is run to recalculate elements such as class-boxes, timeboxes, and all the elements that make up the visuals.
 * This should be run anytime data changes that relates to the current schedule or settings.
 */
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
    $('.dayrow').children('.content').css('border-right', 'none');
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

        var cbContainer = $('<div></div>');
        cbContainer.addClass('class-box-container');
        classBox.append(cbContainer);

        // create title element
        var cbDisplayName = $('<div></div>');
        cbDisplayName.addClass('class-box-title');
        cbDisplayName.text(classInfo.displayName);
        cbContainer.append(cbDisplayName);

        // create subtitle element
        var cbClassID = $('<div></div>');
        cbClassID.addClass('class-box-subtitle');
        cbClassID.text(classID);
        cbContainer.append(cbClassID);

        // create time element
        var cbTime = $('<div></div>');
        cbTime.addClass('class-box-subtitle');
        cbTime.text(parseDecimalTimeToString(classInfo.startTime, false) + ' - ' + parseDecimalTimeToString(classInfo.endTime, false));
        cbContainer.append(cbTime);

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

                // resize text in small boxes to fit

                let hasBeenAdjusted = false;
                let prevRatio = 1;

                let totalClassBoxHeight = clone.outerHeight(true);
                if (totalClassBoxHeight <= 30) {
                    clone.addClass('inline');
                    clone.find('.class-box-subtitle').hide();
                }

                for (let k = 0; k < 100; k++) { // due to text line overflow, it needs to run multiple times
                    var totalChildrenHeight = clone.children('.class-box-container')[0].offsetHeight;
                    let ratio = totalClassBoxHeight / (totalChildrenHeight); // ratio of classBoxHeight to child height
                    
                    // if container size is close enough to the box, stop adjusting
                    if (ratio > 0.95 && ratio < 1.00) {
                        break;
                    }

                    // handles sizes that are right next to text overflow, and so will loop forever
                    // if this occurs, select the smallest of the two
                    if (k == 99) {
                        newRatio = ratio * prevRatio;
                        // pick the smallest ratio
                        if (newRatio > prevRatio) {
                            ratio = prevRatio;
                            prevRatio = 1;
                        } else {
                            ratio = newRatio;
                            prevRatio = 1;
                        }
                        clone.children('.class-box-container').attr("data-overflow", true);
                    }

                    function dependentRound(n) {
                        // will round depending on the gradient font size setting
                        if (settings.gradientFontSize == true) {
                            return n;
                        } else {
                            return Math.floor(n);
                        }
                    }
                    
                    // update the class-box-container
                    clone.children('.class-box-container').each(function() {
                        // if the text is larger than the container,
                        // or was previously adjusted
                        if (ratio < 1 || hasBeenAdjusted) {
                            hasBeenAdjusted = true;
                            ratio = ratio * prevRatio;
                            $(this).children(".class-box-title").css('font-size', `${dependentRound(20 * ratio)}px`).css('line-height', `${dependentRound(20 * ratio)}px`).css('margin-bottom', `${5 * ratio}px`);
                            $(this).children(".class-box-subtitle").css('font-size', `${dependentRound(12 * ratio)}px`).css('line-height', `${dependentRound(12 * ratio)}px`).css('margin-bottom', `${5 * ratio}px`);
                            $(this).css("padding-top", `${20 * ratio}px`);
                            $(this).css("padding-bottom", `${10 * ratio}px`);
                            prevRatio = ratio;
                        }
                    })

                    // perform experimental if enabled
                    if (k == 99 && settings.experimentalScaling) {
                        var totalChildrenHeight = clone.children('.class-box-container')[0].offsetHeight;
                        let ratio = totalClassBoxHeight / (totalChildrenHeight); // ratio of classBoxHeight to child height
                        if (ratio > 1) {
                            // adjust scale
                            clone.children('.class-box-container').css('scale', `${ratio * 100}%`);

                            // adjust width offset
                            let width = clone.children('.class-box-container').width();
                            let offset = (width * ratio - width) / 2;
                            clone.children('.class-box-container').css("left", `${offset}px`).css('position', 'relative');

                            // adjust height offset
                            var newHeight = totalChildrenHeight * ratio;
                            var heightOffset = (newHeight - totalChildrenHeight) / 2;
                            clone.children('.class-box-container').css("top", `${heightOffset}px`);
                            break;
                        }
                    }
                }
            }
        }
    }
}

/**
 * Calculates the width of text of a given font size using HTML canvas properties
 * Does not modify the DOM
 */
function getTextWidth(text, font) {
    // create a new canvas or use existing
    const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = font;
    const metrics = context.measureText(text);
    return metrics.width;
}

/**
 * Calculates the integer intervals for displaying the events based on the current events in the schedule.
 * This should be called before draw when data relating to the times of the current schedule changes, or when the schedule is changed.
 */
function calculateInterval() {
    // reset start and end times
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

/**
 * Sets the visibility of a dayrow based on the bool parameter. Also adds classes to visible rows.
 * @param {boolean} bool - Controls whether the row should be shown or hidden. A true value will show the row, while a false value will hide it.
 * @param {string} id - The id of the row element to operate on.
 * @returns {int} - Returns 1 if the row was shown, and 0 if the row was hidden.
 */
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

/**
 * Reliably gets the length of the schedules list. This is necessary because Object.keys() will occasionally returns keys whose values are null or undefined, and as such, Object.keys().length is unreliable for determining the amount of schedules. 
 * @returns {int} - The number of schedules.
 */
function schedulesLength() {
    var length = 0;
    for (const key in schedules) {
        if (schedules[key] != null) {
            length++;
        }
    }
    return length;
}

/**
 * Generates a string time label from an integer
 * @param {int} timeInt - An integer from 0-24.
 * @returns {string} - A string representing the given time in HH:00 AM/PM format.
 */
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

/**
 * Parses a time string into a decimal time.
 * @param {string} timeString - A string representing the time in HH:MM AM/PM format.
 * @returns {number} - A decimal number from between 0-24 representing the given time string.
 */
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

/**
 * Parses a decimal time number into a human-readable time string.
 * @param {number} time - A decimal number from 0-24.
 * @param {boolean} [useSpaces=true] - Whether or not put spaces between the time and the AM/PM.
 * @returns {string} - A human readable time string in HH:MM AM/PM format.
 */
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

/**
 * Loads schedules information from localStorage into local variables.
 * This function should probably be called loadScheduleInfo, as that is more accurate, but it was originally used for loading individual schedules before multi-schedule support. A refactor is probably in order for the future.
 */
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

/**
 * Loads settings information from localStorage into local variables.
 */
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
    settings.experimentalScaling = getDefault(convertToBool(localStorage.getItem('experimentalScaling')), false);
    settings.gradientFontSize = getDefault(convertToBool(localStorage.getItem('gradientFontSize')), false);
}

/**
 * Saves all schedule information from local variables into localStorage.
 */
function saveClassInfo() {
    schedules[currentSchedule] = classes;
    var jsonSchedulesInfo = JSON.stringify(schedules);
    window.localStorage.setItem('schedules', jsonSchedulesInfo);
    window.localStorage.setItem('currentSchedule', currentSchedule);
}

/**
 * Saves settings from local variables into localStorage.
 */
function saveSettings() {
    
    // days
    localStorage.setItem('settingsDaySunday', settings.daysEnabled[0]);
    localStorage.setItem('settingsDayMonday', settings.daysEnabled[1]);
    localStorage.setItem('settingsDayTuesday', settings.daysEnabled[2]);
    localStorage.setItem('settingsDayWednesday', settings.daysEnabled[3]);
    localStorage.setItem('settingsDayThursday', settings.daysEnabled[4]);
    localStorage.setItem('settingsDayFriday', settings.daysEnabled[5]);
    localStorage.setItem('settingsDaySaturday', settings.daysEnabled[6]);
    localStorage.setItem('experimentalScaling', settings.experimentalScaling);
    localStorage.setItem('gradientFontSize', settings.gradientFontSize);
}

/**
 * Sets the preview box color in either the editClass or addClass modal.
 * Should be run when the color select is changed.
 * @param {string} prefix - either editClass or addClass depending on which modal
 */
function setPreviewBoxColor(prefix) {
    var colorOption = $(`#${prefix}Color`).val();
    $('.color-preview-box').attr('class', 'input-group-text color-preview-box custombg-' + colorOption);
}

/**
 * Loads the edit class modal with the proper values when a class is clicked.
 * @param {string} classID 
 */
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

/**
 * Uses settings to determine whether to hide or show day options in the editClass or addClass modals.
 * @param {string} prefix - Either editClass or addClass depending on which modal it is.
 */
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

/**
 * The object that contains information for a given class.
 * @typedef {Object} ClassInfo
 * @property {string} displayName - The display name of the class
 * @property {number} startTime - The start time of the class, stored as a decimal number from 0-24
 * @property {number} endTime - The end time of the class, stored as a decimal number from 0-24
 * @property {Array<boolean>} days - An array with 7 booleans denoting what days the class is on. The first value in the array is Sunday, and the last is Saturday. Each value should be either true (class is enabled on that day), or false (class is not enabled on that day)
 * @property {string} color - The display color of the class
 */

/**
 * The object returned by parseClassInfo.
 * @typedef {Object} ParseClassInfoReturn
 * @property {boolean} invalid - Whether the inputted values were invalid. If this value returns true, the returned information should not be saved.
 * @property {string} classID - The class ID of the returned class object.
 */

/**
 * Parses modal information into a classInfo object. Also performs validation for inputted values.
 * @param {string} prefix - either editClass or addClass, depending on which modal it is.
 * @param {boolean} editingMode - Controls whether to check for duplicates as part of the validation process. If set to true, the duplication check will be skipped.
 * @param {ClassInfo} classInfo - The ClassInfo object, parsed from the inputs in the modals.
 * @returns {ParseClassInfoReturn}
 */
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
    if (endTime == null) {
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

/**
 * An object representing the contens of a schedule file.
 * @typedef {Object} ScheduleFile
 * @property {string} name - The name of the schedule
 * @property {Array<ClassInfo>} classes - A list of classes in the form of ClassInfo objects
 */

/**
 * An object that represents the return value of verifyScheduleFile
 * @typedef {Object} VerifyScheduleFileReturn
 * @property {boolean} success - Whether or not the schedule is valid.
 * @property {ScheduleFile} contents - The contents of the schedule file, in object form.
 */

/**
 * Verifies schedule file contents.
 * @param {string} fileContents - The contents of the actual file, as a string of text
 * @returns {VerifyScheduleFileReturn} - An object consisting of success and contents
 */
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

/**
 * Parses a new schedule name to avoid duplicates.
 * @param {string} newName - The unverified new name.
 * @returns {string} - If the name did not conflict with any other schedule name, then the returned value is the same. Otherwise, it is slightly modified to avoid conflicts.
 */
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

/**
 * Builds the viewSchedules modal. Should be called whenever any top-level schedule information is updated.
 */
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

/**
 * Sets the current schedule by updating currentSchedule, updating classes, saving class info, rebuilding the schedules modal, and redrawing.
 * @param {string} newScheduleName - the schedule id of the schedule to switch to.
 */
function setCurrentSchedule(newScheduleName) {
    currentSchedule = newScheduleName;
    classes = schedules[currentSchedule];
    saveClassInfo();
    buildSchedulesModal();
    calculateInterval();
    draw();
}

/**
 * Converts a boolean represented as a string into a boolean, since javascript is unreliable.
 * @param {string} boolString - a string that represents a boolean, either 'true' or 'false'
 * @returns {boolean?} - returns true or false based on the boolString parameter, or null if boolString was not 'true' or 'false'
 */
function convertToBool(boolString) {
    switch (boolString) {
        case 'true':
            return true;
        case 'false':
            return false;
    }
}

/**
 * Detects whether value is null. If value is not null, then value is returned, otherwise, defaultValue is returned.
 * @param {*} value 
 * @param {*} defaultValue 
 * @returns {*} - value is value is not null, otherwise defaultValue
 */
function getDefault(value, defaultValue) {
    if (value == null) {
        return defaultValue;
    } else {
        return value;
    }
}

/**
 * Checks whether or not to display the mobileWarningModal based on the size of the screen.
 * If the screen size is under a certain threshold, it dislays the mobileWarningModal.
 */
function checkMobileWarning() {
    const viewHeight = $(window).height();
    const viewWidth = $(window).width();

    if ((viewWidth < 1000 || viewHeight < 300) && !mobileWarningModalShown) {
        $('#mobileWarningModal').modal('show');
    }
}

/**
 * Runs draw whenever the page size changes.
 */
$(window).on('resize', function () {
    draw();
});

/**
 * Sets default values for all the inputs on the add class modal.
 * Run when the Add Class button is clicked.
 */
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

/**
 * Handler for submission of add class form.
 * Updates the schedule by validating and adding a new class.
 */
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

/**
 * Handler for submission of edit class form.
 * Updates the schedule by updating a class.
 */
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

/**
 * Updates the preview box color when the color option is changed.
 */
$('#addClassColor').on('change', function () {
    setPreviewBoxColor('addClass');
});

/**
 * Updates the preview box color when the color option is changed.
 */
$('#editClassColor').on('change', function () {
    setPreviewBoxColor('editClass');
});

/**
 * Handler for edit class remove button
 * Removes a class from the current schedule.
 */
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

/**
 * Handler for save as png button
 * Manages logic for saving a png of the current schedule.
 */
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

/**
 * Handler for View Schedules button
 * Builds and opens the schedules modal
 */
$('#viewSchedulesButton').on('click', function () {
    buildSchedulesModal();
    $('#viewSchedulesModal').modal('show');
});

/**
 * Handler for view schedules new schedule button
 * Adds a new schedule
 */
$('#viewSchedulesNewScheduleButton').on('click', function() {
    var newScheduleName = parseNewScheduleName(defaultScheduleName);
    schedules[newScheduleName] = {};
    setCurrentSchedule(newScheduleName);
});

/**
 * Handler for view schedules upload schedule button
 * Resets and opens the upload schedule modal
 */
$('#viewScheduleUploadScheduleButton').on('click', function () {
    $('#uploadScheduleFileInput').val('');
    $('#uploadScheduleFileInputFeedback').hide();
    $('#uploadScheduleUploadButton').addClass('disabled');
    $('#viewSchedulesModal').modal('hide');
    $('#uploadScheduleModal').modal('show');
});

/**
 * Handler for the changing of the upload schedule file input
 * Determines whether there is input and enables the upload button accordingly
 */
$('#uploadScheduleFileInput').on('change', function () {
    var inputValue = $('#uploadScheduleFileInput').val();
    if (inputValue != "") {
        $('#uploadScheduleUploadButton').removeClass('disabled');
    }
});

/**
 * Handler for the upload schedule modal upload button
 * Parses and loads the new schedule based on the inputted schedule file
 */
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

/**
 * Handler for closing of upload schedule modal
 * Opens the view schedules modal
 */
$('#uploadScheduleModal').on('hide.bs.modal', function() {
    $('#viewSchedulesModal').modal('show');
});

/**
 * Handler for the settings button
 * Sets the correct values and opens the settings modal
 */
$('#settingsButton').on('click', function () {
    // setup days
    $('#settingsDaySunday').prop('checked', settings.daysEnabled[0]);
    $('#settingsDayMonday').prop('checked', settings.daysEnabled[1]);
    $('#settingsDayTuesday').prop('checked', settings.daysEnabled[2]);
    $('#settingsDayWednesday').prop('checked', settings.daysEnabled[3]);
    $('#settingsDayThursday').prop('checked', settings.daysEnabled[4]);
    $('#settingsDayFriday').prop('checked', settings.daysEnabled[5]);
    $('#settingsDaySaturday').prop('checked', settings.daysEnabled[6]);
    $('#experimentalScaling').prop('checked', settings.experimentalScaling);
    $('#gradientFontSize').prop('checked', settings.gradientFontSize);

    $('#settingsModal').modal('show');
});

/**
 * Handler for the changing of day checkboxes in the settings modal
 * Sets the correct values in settings
 */
$('.settings-ui').on('change', function(event) {
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
        case 'experimentalScaling':
            settings.experimentalScaling = checked;
            break;
        case 'gradientFontSize':
            settings.gradientFontSize = checked;
            saveSettings();
            location.reload();
            break;
    }

    saveSettings();
    calculateInterval();
    draw();
});

/**
 * Handler for the full reset button in the schedules modal
 * Resets localStorage
 */
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

// start the app
loadSettings();
loadClassInfo();
calculateInterval();
draw();
setTimeout(checkMobileWarning, 1000);