/*
* Worker related tasks
*/

//Dependancies
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
const _data = require('./data-file-repository');
const helpers = require('./helpers');
const url = require('url');
const _logs = require('./logs');
const util = require('util');
const debug = util.debuglog('workers');

//Instantiate the workers object
let workers = {};

//Loop that execute checks every minute
workers.loop = function(){
    setInterval(function(){
        workers.gatherAllChecks();
    }, 1000 * 60);
};

//Loop that executes and rotates log once a day
workers.logRotationLoop = function(){
    setInterval(function(){
        workers.rotateLogs();
    }, 1000 * 60 * 60 * 24);
};

//Compresses logs
workers.rotateLogs = function(){
    //List all non compressed logs
    _logs.list(false, function(error, logs){
        if(!error && logs.length > 0){
            logs.forEach(logName => {
                //Compress the data to a different file
                let logId = logName.replace('.log', '');
                let newFileId = logId+'-'+Date.now();
                _logs.compress(logId,newFileId,function(error){
                    if(!error){
                        //Truncate log
                        _logs.truncate(logId,function(error){
                            if(!error){
                                debug("Success truncating log file");
                            }
                            else{
                                debug("Error: truncating log file");
                            }
                        });
                    }
                    else {
                        debug("There was an issue compressing a log file", error);
                    }
                });
            });
        }
        else {
            debug("Error: could not find any logs to rotate");
        }
    });
};

//Look up all the checks and send it to a validator
workers.gatherAllChecks = function(){
    _data.list('checks', function(error, checks){
        if(!error && checks && checks.length > 0){
            checks.forEach(check => {
                _data.read('checks', check, function(error, originalCheckData){
                    if(!error && originalCheckData){
                        //Pass it to the check validator
                        workers.validateCheckData(originalCheckData);
                    }
                    else {
                        debug("Error: issue reading check data");
                    }
                });
            });
        }
        else {
            debug("Error: could not perform checks");
        }

    });
};

//Checks for check validity
workers.validateCheckData = function(originalCheckData){
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['put', 'post', 'get', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    //Set keys if they have no been set by workers
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state.trim() : "down";
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    //If all checks pass return data to process
    if(originalCheckData.id && originalCheckData.userPhone && originalCheckData.protocol && originalCheckData.url && originalCheckData.method && originalCheckData.successCodes
        && originalCheckData.timeoutSeconds){           
            workers.performCheck(originalCheckData, function(error){

            });
    }
    else {
        debug("Error: one of the checks is missing data");
    }
};

workers.performCheck = function(originalCheckData){
    //Perform the original outcome
    let checkOutcome = {
        'error': false,
        'responseCode': false
    }

    //Mark outcome has not been returned
    let outcome = false;

    //Get original data
    let parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url, true);
    let hostName = parsedUrl.hostname;
    let path = parsedUrl.path;

    let requestDetails = {
        'protocol' : originalCheckData.protocol+':',
        'hostname': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000
    };

    //Istantiate request object
    var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    var request = _moduleToUse.request(requestDetails, function(response){
        //Grad the data of the sent request
        let status = response.statusCode;

        //Update check out come then pass the data along
        checkOutcome.responseCode = status;

        if(!outcome){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcome = true;
        }
    });

    request.on('error', function(error){
        checkOutcome.error = {
            'error': true,
            'value': error
        };
        if(!outcome){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcome = true;
        }
    });

    request.on('timeout', function(error){
        checkOutcome.error = {
            'error': true,
            'value': 'timeout'
        };
        if(!outcome){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcome = true;
        }
    });

    request.end();
};

//Process the check outcome, and update the data as needed, then send an alert
//Special logic don't send an sms for checks that have never been on
workers.processCheckOutcome = function(originalCheckData, checkOutcome){
    //Decide if the check is up or down
    let state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

    //Decide if you need to alert
    let alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    let timeOfCheck = Date.now();

    //Update the check data
    let newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;

    //Log the outcome, log the checkdata, log if alert was warranted, log time
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

    //Save udpate
    _data.update('checks', newCheckData.id, newCheckData, function(error){
        if(!error){
            //Send data to the next processes.
            if(alertWarranted){
                workers.alertUsersToStatusChanged(newCheckData);
            }
            else {
                debug("No alert needed");
            }
        }
        else {
            debug("Error: Trying to save new check data");
        }
    });
};

//Alert user that there was a change in there check status
workers.alertUsersToStatusChanged = function(newCheckData){
    let message = 'Alert: Your check for ' + newCheckData.method.toUpperCase()+ ' ' + newCheckData.protocol + '://' + newCheckData.url +' is currently ' +newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userPhone, message, function(error){
        if(!error){
            debug("Success: sent message", message);
        }
        else {
            debug("Error: there was an error sending sms");
        }
    });
};

workers.log = function(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck){
    //Form the log data
    let logData = {
        "check": originalCheckData,
        "outcome": checkOutcome,
        "state": state,
        "alert": alertWarranted,
        "time": timeOfCheck
    };

    let logString = JSON.stringify(logData);

    //Determine the log file name
    let logFileName = originalCheckData.id;

    //Append the log string to the file
    _logs.append(logFileName, logString, function(error){
        if(!error){
            debug("Logging to file succeed");
        }
        else{
            debug("Logging to file failed");
        }
    });
};

//Init funtion
workers.init = function(){

    //Send to debug in yellow
    debug('\x1b[33m%s\x1b[0m', 'Background workers are running');

    //Execute all checks
    workers.gatherAllChecks();

    //Call loop so they continue on there own
    workers.loop();

    //Compress all logs
    workers.rotateLogs();

    //Call the logs compression loop so logs are compressed later on
    workers.logRotationLoop();
};

//Export module
module.exports = workers;
