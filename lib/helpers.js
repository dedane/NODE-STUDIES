/*
*Helpers for various files
*
*/

//DEPENDENCIES
var crypto = require('crypto')
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
// Export the module
module.exports = helpers;