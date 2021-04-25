/*
*Worker-related tasks
*
*/

//Dependencies
var path = require('path')
var fs = require('fs');
var _data = require('./data')
var https = require('https');
var http = require('http');
var helpers = require('./helpers');
var url = require('url');
const { worker } = require('cluster');
const { type } = require('os');
var _logs = require('./logs');

//Instatiate workers object
var workers = {}

//Lookup all the checks,get their data, send to a validator
workers.gatherAllChecks = function(){
    //Get all the checks
    _data.list('checks',function(err,checks){
        if(!err && checks && checks.length > 0){
            checks.forEach(function(check) {
                _data.read('checks',check,function(err,originalCheckData){
                    if(!err && originalCheckData){
                        //Pass it to the check validator and let the function continue or log errors as needed
                        workers.validateCheckData(originalCheckData)

                    }else {
                        console.log("Error reading check data")
                    }
                })
            });
        }else {
            console.log('Error: Could not find any checks here')
        }
    })
}


//Sanity-check the check-data
workers.validateCheckData = function(originalCheckData){
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexOf(originalCheckData.protocol) ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0  ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' &&  ['post','get','put','delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;


    //Set the key that might not be set if the workers had not be seen before
   originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','Down'].indexOf(originalCheckData.state) ? originalCheckData.state : 'Down';
   originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0  ? originalCheckData.lastChecked : false;


   //If all the checks pass, pass the data along to the next step in the process
   if(originalCheckData.id && originalCheckData.userPhone && originalCheckData.protocol && originalCheckData.url && originalCheckData.method && originalCheckData.successCodes && originalCheckData.timeoutSeconds){
    workers.performCheck(originalCheckData)
   } else {
       console.log('Error one of the checks is not properly formated. skipping it')
   }
}


// Perform the check, send the originalCheckData and outcoe of the check process
workers.performCheck = function(originalCheckData){
    var checkOutcome = {
        'error': false,
        'responseCode': false
    }

    //MARK THE OUTCOME HAS NOT BEEN SENT YET
    var outcomeSent = false;

    //Parse the hostname and tyhe path out of the original check data
    var parsedUrl = url.parse(originalCheckData.protocol +'://'+originalCheckData.url,true);
    var hostName = parsedUrl.hostname;
    var path = parsedUrl.path

    //Construct the request
    var requestDetails = {
        'protocol': originalCheckData.protocol+':',
        'hostname': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000
    }

    //Instatiate the request object (using either the http ot https module)
    var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    var req = _moduleToUse.request(requestDetails,function(res){
        //Grab the status of the sent request
        var status = res.statusCode;

        //Update the checkoutcome and pass the data along
        checkOutcome.responseCode = status;
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData,checkOutcome)
            outcomeSent = true;
        }
    })

    //Bind to the error event so that doesnt get thrown
    req.on('error', function(e){
        //Update the checkoutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': e
        }
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData,checkOutcome)
            outcomeSent = true;
        }
    })

    //Bind to the time out event
    req.on('timeout', function(e){
        //Update the checkoutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': 'timeout'
        }
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData,checkOutcome)
            outcomeSent = true;
        }
    })

    //End the request and send it
    req.end();

}

// Process the check outcome, update check data as needed and alert the user
// Special logic for accomodating a check that has never been tested before
workers.processCheckOutcome = function(originalCheckData,checkOutcome){

    //Decide if the check state is up or down
    var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up': 'Down';

    //Decide if an alert is warranted
    var alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    //Update the check Data
    let newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();
    

   //  log the outcome of the check
    var timeOfCheck = Date.now();
     workers.log(originalCheckData, checkOutcome,state,alertWarranted,timeOfCheck);
     

    //Save the update
    _data.update('checks', newCheckData.id, newCheckData, function(err){
        if(!err){
            //send the new check to the next phase in the process if needed
            if(alertWarranted){
                workers.alertUserToStatusChange(newCheckData);
            } else {
                console.log('Check outcome has no changes, no alert needed')
            }
        }else {
            console.log('Error trying to save updates to one of the checks')
        }
    })

}

workers.alertUserToStatusChange = function(newCheckData){
    var msg = 'Alert: your check for '+ newCheckData.method.toUpperCase()+''+newCheckData.protocol+'://'+newCheckData.url+' is currently'+ newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userPhone,msg,function(err){
        if(!err){
            console.log("Success user was alerted to a status change in their check via sms")
        } else {
            console.log( 'Error: Could not send sms to user that had a state change via sms');
        }
    })
}
//  log the outcome of the check
var timeOfCheck = Date.now();

workers.log= function(originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck){
    //Form the log data
    var logData = {
        'check': originalCheckData,
        'outcome': checkOutcome,
        'state': state,
        'alert': alertWarranted,
        'time': timeOfCheck
    }

    //convert data to string
    var logString = JSON.stringify(logData);


    //determine the name of the log file
    var logFileName = originalCheckData.id;


    //Append the log string to file with a log name
    _logs.append(logFileName,logString,function(err){
        if(!err){
            console.log("Logging to file succeded");
        } else{
            console.log('Logging has failed')
        }
    })
}


//Timer to execute the worker-process once per minute
workers.loop = function(){
    setInterval(function(){
        workers.gatherAllChecks();
    },1000 * 60)
}

//Rotate (compress) the log files
workers.rotateLogs = () => {
    //list all the (non compressed) files
    _logs.list(false, function(err,logs){
        if(!err && logs && logs.length >0){
            logs.forEach(function(logName){
                var logId = logName.replace('.log', '');
                var newFileId = logId+'-'+Date.now();
                _logs.compress(logId, newFileId, function(err){
                    if(!err){
                        //Truncate the log
                        _logs.truncate(logId, function(err){
                            if(!err){
                                console.log("Success truncate logFile");
                            }
                            else{
                                console.log("Error truncating log file");
                            }
                        })
                    } else{
                        console.log("Error compressing one of the log file",err)
                    }
                });
            })
        } else {
            console.log(err)
        }
    })

}
 //Time to compress the log-rotation once per day
 workers.logRotationLoop = () => {
    setInterval(function(){
        workers.rotateLogs();
    },1000 * 60 * 60 *24)
}

//Init script
workers.init = function(){
    //Execute all the checks Immediately
    workers.gatherAllChecks();

    //Call the loop so all checks will execute later on
    workers.loop();

    //compress all the logs immediately
    workers.rotateLogs();

     //call the compression loop so logs will be compressed later on
    workers.logRotationLoop();
   
}

module.exports = workers;