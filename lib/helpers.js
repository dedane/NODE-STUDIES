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
const AfricasTalking = require('africastalking');
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
      'from': config.at.fromPhone,
      'to': "+254"+phone,
      'Body': msg
    }
    //Stringify the payload
    var stringPayload = queryString.stringify(payload)

    //Configure  the request details
    const africastalking = AfricasTalking({
      apiKey: '1b6547371334b836f58544480aa45a720b1cde4d63d06434d384f7987dee808b', 
      username: 'sandbox',
      'headers' : {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    });

    //Instatiates the request object
    var req = https.request(africastalking, function(res){
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

   } 
   else {
     callback('Given parameters are missing')
   }
}
// Export the module
module.exports = helpers;