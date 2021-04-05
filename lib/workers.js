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

//Instatiate workers object
var workers = {}

//Lookup all the checks,get their data, send to a validator
workers.gatherAllChecks = function(){
    //Get all the checks
    _data.list('checks',function(err,checks){
        if(!err && checks && checks.length > 0){
            checks.forEach(check => {
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
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexof(originalCheckData.protocol) ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url !== null ? originalCheckData.url : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['get','post','put','delete'].indexof(originalCheckData.method) ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length >  0 ? originalCheckData.successCodes : {};
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds %1 == 0 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;


    //Set the key that might not be set if the workers had not be seen before
   originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','Down'].indexof(originalCheckData.state) ? originalCheckData.state : 'Down';
   originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0  ? originalCheckData.lastChecked : false;


   //If all the checks pass, pass the data along to the next step in the process
   if(originalCheckData.id && originalCheckData.userPhone && originalCheckData.protocol && originalCheckData.url && originalCheckData.method && originalCheckData.successCodes && originalCheckData.timeoutSeconds){
    worker.performChecl(originalCheckData)
   } else {
       console.log('Error one of the checks is not propers formated. skipping it')
   }
}


// Perform the check, send the originalCheckData and outcoe of the check process
workers.performChecK = function(originalCheckData){
    var checkOutcome = {
        'error': false,
        'responseCode': false
    }

    //mARK THE OUTCOME HAS NOT BEEN SENT YET
    var outcomeSent = false;

    //Parse the hostname and tyhe path out of the original check data
    var parsedUrl = url.parse(originalCheckData.protocol +'://'+originalCheckData.url,true);
    var hostName = parsedUrl.hostname;
    var path = parsedUrl.path

    //Construct the request
    var requestDetails = {
        'protocol': originalCheckData.protocol+':',
        'hostname': hostName,
        'method': originalCheckData.method.toUppeCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000
    }

    //Instatiate the request object (using either the http ot https module)
    var _moduleToUse = originalCheckData.protocol = 'http' ? http: https;
    var req = _moduleToUse.request(requestDetails,function(err){
        //Grab the status of the sent request
        var status = res.statusCode;

        //Update the checkoutcome and pass the data along
        checkOutcome.responseCode = status;
        if(!outcomeSent){
            workers.processCheclOutcome(originalCheckData,checkOutcome)
            outcomeSent = true;
        }
    })

    //Bind to the error event so that it doesnt get thrown
    req.on('error', function(e){
        //Update the checkoutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': e
        }
        if(!outcome){
            workers.processChecKOutcome(originalCheckData,checkOutcome)
            outcomeSent = true;
        }
    })

    //Bind to the time out event
    req.on('timeout', function(e){
        //Update the checkoutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': timeout
        }
        if(!outcome){
            workers.processCheclOutcome(originalCheckData,checkOutcome)
            outcomeSent = true;
        }
    })

    //End the request and send it
    req.end();

}

// Process the check outcome, update check data as needed and alert the user
// Special logic for accomodating a check that has never been tested before
workers.processChecKOutcome = function(originalCheckData,checkOutcome){

    //Decide if the check state is up or down
    var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexof(checkOutcome.responseCode) > -1 ? 'up': 'Down';

    //Decide if an alert is warranted
    var alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    //Update the check Data
    newcheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();

    //Save the update
    _data.update('checks',newCheckData.id,newCheckData,function(err){
        if(!err){
            //send the new ncheck to the next phase in the process if needed
            if(allertWarranted){
                workers.alertUserToStatusChange(nedwCheckData);
            } else {
                console.log('Check outcome has not changes, no alert needed')
            }
        }else {
            console.log('Error trying to save updates to one of the checks')
        }
    })

}

workers.alertUserToStatusChange = function(newCheckData){
    var msg = 'Alert: your check for '+ newCheckData.method.toUppeCase()+''+newCheckData.protocol+'://'+newCheckData.url+' is currently'+ newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userPhone,msg,function(err){
        if(!err){
            console.log("Success user was alerted to a status change in their check via sms")
        } else {
            console.log( 'Error: Could not send sms to user that had a state change via sms');
        }
    })
}



//Timer to execute the worker-process once per minute
workers.loop = function(){
    setInterval(function(){
        workers.gatherAllChecks();
    },1000 * 60)
}

//Init script
workers.init = function(){
    //Execute all the checks Immediately
    workers.gatherAllChecks();

    //Call the loop so all checks will execute later on
    workers.loop();
}

module.exports = workers;