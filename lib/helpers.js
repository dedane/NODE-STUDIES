/*
*Helpers for various files
*
*/

//DEPENDENCIES
var crypto = require('crypto');
const { type } = require('os');
var https = require('https');
var queryString = require('querystring');
var config = require('../config');

//CONTAINER FOR ALL HELPERS

// Container for all the helpers
var helpers = {};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = function(str){
  try{
    var obj = JSON.parse(str);
    return obj;
  } catch(e){
    return {};
  }
};

// Create a SHA256 hash
helpers.hash = function(str){
  if(typeof(str) == 'string' && str.length > 0){
    var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
};

//CREATE  A STRING OF ALPHANUMERIC CHARACTERS
helpers.createRandomString = function(strLength){
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
    if(strLength){
        var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456987'

        var str = '';
        for (i = 1; i <= strLength; i++){
            var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))
                str+=randomCharacter
        }
        //Return final string
        return str;
    }
}




//Send an sms message via Twilio
helpers.sendTwilioSms = function(phone,msg,callback){
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
  msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
   if(phone && msg){
    //Configure the request payload
    var payload = {
      'from': config.twilio.fromPhone,
      'to': "+1"+phone,
      'Body': msg
    }
    //Stringify the payload
    var stringPayload = queryString.stringify(payload)

    //Configure  the request details
    var requestDetails = {
      'protocol': 'https:',
      'hostname': 'api.twilio.com',
      'method': 'POST',
      //'path': '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
      'auth': config.twilio.accountSid+':'+config.twilio.autToken,
      'headers' : {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    }

    //Instatiates the request object
    var req = https.request(requestDetails, function(res){
      //Grab the status of the sent request
      var status = res.statusCode;
      //Callback successfully if the request went through
      if(status == 200 && status == 201){
        callback(false)
      }
      else{
        callback('Status code returned was'+ status)
      }
    })

    //Bind to the error event so it doesnt get thrown
    req.on('error',function(e){
      callback(e)
    })

    //Add the payload
    req.write(stringPayload);

    //End the request
    req.end

   } else {
     callback('Given parameters are missing')
   }
}
// Export the module
module.exports = helpers;