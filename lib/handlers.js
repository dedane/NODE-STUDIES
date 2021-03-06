/*
 * Request Handlers
 *
 */

// Dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('../config');
// Define all the handlers
var handlers = {};

// Ping
handlers.ping = function(data,callback){
    callback(200);
};
/*
**
**HTML HANDLERS
**
*/

//Index handlers

handlers.index = function (data, callback) {

  //Reject any request that is not a Get request
  if(data.method == 'get'){
    helpers.getTemplate('index',function(err,str) {
      if(!err && str){
        callback(200,str, 'html');
    }
    else {
      callback(500,undefined, 'html')
    }
  });
   
}
else{
  callback(undefined, undefined, 'html');
  }
}
//Json api handlers
// Not-Found
handlers.notFound = function(data,callback){
  callback(404);
};

// Users
handlers.users = function(data,callback){
  var acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._users[data.method](data,callback);
  } else {
    callback(405);
  }
};

// Container for all the users methods
handlers._users  = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function(data,callback){
  // Check that all required fields are filled out
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

  if(firstName && lastName && phone && password && tosAgreement){
    // Make sure the user doesnt already exist
    _data.read('users',phone,function(err,data){
      if(err){
        // Hash the password
        var hashedPassword = helpers.hash(password);

        // Create the user object
        if(hashedPassword){
          var userObject = {
            'firstName' : firstName,
            'lastName' : lastName,
            'phone' : phone,
            'hashedPassword' : hashedPassword,
            'tosAgreement' : true
          };

          // Store the user
          _data.create('users',phone,userObject,function(err){
            if(!err){
              callback(200);
            } else {
              console.log(err);
              callback(500,{'Error' : 'Could not create the new user'});
            }
          });
        } else {
          callback(500,{'Error' : 'Could not hash the user\'s password.'});
        }

      } else {
        // User alread exists
        callback(400,{'Error' : 'A user with that phone number already exists'});
      }
    });

  } else {
    callback(400,{'Error' : 'Missing required fields'});
  }

};

// Required data: phone
// Optional data: none
// @TODO Only let an authenticated user access their object. Dont let them access anyone elses.
handlers._users.get = function(data,callback){
  // Check that phone number is valid
  var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(phone){

    //Get the token from headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    //Verify the token provided is valid for the phone number
    handlers._tokens.verifyToken(token,phone,function(tokenIsValid){

        if(tokenIsValid){
            // Lookup the user
        _data.read('users',phone,function(err,data){
            if(!err && data){
            // Remove the hashed password from the user user object before returning it to the requester
                 delete data.hashedPassword;
                callback(200,data);
            } else {
                callback(404);
            }
      });
        } else {
            callback(403,{'Error': 'Missing required token in header, or token is invalid'})
        }
    })
    
  } else {
    callback(400,{'Error' : 'Missing required field'})
  }
};

// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
// @TODO Only let an authenticated user up their object. Dont let them access update elses.
handlers._users.put = function(data,callback){
  // Check for required field
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

  // Check for optional fields
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  // Error if phone is invalid
  if(phone){
    // Error if nothing is sent to update
    if(firstName || lastName || password){
      // Lookup the user

       //Get the token from headers
      var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

      //Verify the token provided is valid for the phone number
    handlers._tokens.verifyToken(token,phone,function(tokenIsValid){

        if(tokenIsValid){
            _data.read('users',phone,function(err,userData){
                if(!err && userData){
                  // Update the fields if necessary
                  if(firstName){
                    userData.firstName = firstName;
                  }
                  if(lastName){
                    userData.lastName = lastName;
                  }
                  if(password){
                    userData.hashedPassword = helpers.hash(password);
                  }
                  // Store the new updates
                  _data.update('users',phone,userData,function(err){
                    if(!err){
                      callback(200);
                    } else {
                      console.log(err);
                      callback(500,{'Error' : 'Could not update the user.'});
                    }
                  });
                } else {
                  callback(400,{'Error' : 'Specified user does not exist.'});
                }
              });
        }else {
            callback(403,{'Error': 'Missing required token in header, or token is invalid'})
        }
    })
      
    } else {
      callback(400,{'Error' : 'Missing fields to update.'});
    }
  } else {
    callback(400,{'Error' : 'Missing required field.'});
  }

};

// Required data: phone
// @TODO Only let an authenticated user delete their object. Dont let them delete update elses.
// @TODO Cleanup (delete) any other data files associated with the user
handlers._users.delete = function(data,callback){
  // Check that phone number is valid
  var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(phone){

     //Get the token from headers
     var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

     //Verify the token provided is valid for the phone number
     handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
 
         if(tokenIsValid){
            _data.read('users',phone,function(err,userData){
                if(!err && data){
                  _data.delete('users',phone,function(err){
                    if(!err){
                      //Delete all the checks associated with the user
                      var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                      var checksToDelete = userChecks.length;
                      if(checksToDelete > 0){
                        var checksDeleted = 0;
                        var deletionErrors = false;

                        userChecks.forEach(function(checkId){
                          _data.delete('checks',checkId,function(err){
                            if(err){
                              deletionErrors = true
                            }
                            checksDeleted++;;
                            if(checksDeleted == checksToDelete){
                              if(!deletionErrors){
                                callback(200);
                              } else {
                                callback(500, {'Error': "Errors encountered while attempting to delete checks"})
                              }
                            }
                          })
                        })
                      }
                    } else {
                      callback(500,{'Error' : 'Could not delete the specified user'});
                    }
                  });
                } else {
                  callback(400,{'Error' : 'Could not find the specified user.'});
                }
              });
         }
         else {
          callback(403,{'Error': 'Missing required token in header, or token is invalid'})
        }
      })
    // Lookup the user
  } else {
    callback(400,{'Error' : 'Missing required field'})
  }
};


// Tokens
handlers.tokens = function(data,callback){
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
      handlers._tokens[data.method](data,callback);
    } else {
      callback(405);
    }
  };


  //CONTAINER FOR ALL TOKENS METHODS
  handlers._tokens = {};

  //tokens post
  handlers._tokens.post = function(data,callback){
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    if(phone && password){
        // Lookup user who matches phone number

        _data.read('users',phone,function(err,userData){
            if (!err && userData){
                var hashedPassword = helpers.hash(password)
                if (hashedPassword == userData.hashedPassword){
                    //If valid , create a token with random name that is valid for 1 hour
                    var tokenId =helpers.createRandomString(20);
                    var expires = Date.now() +1000* 60 *60
                    var tokenObject = {
                        'phone': phone,
                        'id': tokenId,
                        "expires": expires
                    }

                    _data.create('tokens',tokenId,tokenObject,function(err){
                        if(!err){
                            callback(200,tokenObject)
                        }else{
                            callback(500,{'Error': 'could not create token'})
                        }
                    })
                }
                else{
                    callback(400,{'Error': 'Password did not match'})
                }
            } else{
                callback(400,{'Error': 'Could not find user'})
            }
        })
    }else {
        callback(400, {'Error': 'Missing required fields'})
    }
  }

  //tokens get
  handlers._tokens.get = function(data,callback){
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    if(id){
        // Lookup the user
        _data.read('tokens',id,function(err,tokenData){
          if(!err && tokenData){
            // Remove the hashed password from the user user object before returning it to the requester
            
            callback(200,tokenData);
          } else {
            callback(404);
          }
        });
      } else {
        callback(400,{'Error' : 'Missing required field'})
      }
}

//tokens put
handlers._tokens.put = function(data,callback){
    //Change values for a specific id
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    if(id && extend){
        _data.read('tokens',id,function(err,tokenData){
            if(!err && tokenData){
                //Check to make sure Token isn't expired
                if(tokenData.expires > Date.now()){
                    tokenData.expires = Date.now() + 1000 * 60 *60;

                    //Store new Token updates
                    _data.update('tokens',id,tokenData,function(err){
                        if(!err){
                            callback(200)
                        }else{
                            callback(500,{'Error' : 'Could not Update Token'})
                        }
                    })
                }
                else{
                    callback(400,{'Error': 'Token has expired and can-not be extended'})
                }
            }
            else{
                callback(400, {'Error': 'Specified token does not exist'})
            }
        })
    }
}

//tokens delete
//Required data is : ID
handlers._tokens.delete = function(data,callback){
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    if(id){
      // Lookup the user
      _data.read('tokens',id,function(err,data){
        if(!err && data){
          _data.delete('tokens',id,function(err){
            if(!err){
              callback(200);
            } else {
              callback(500,{'Error' : 'Could not delete the specified user'});
            }
          });
        } else {
          callback(400,{'Error' : 'Could not find the specified user.'});
        }
      });
    } else {
      callback(400,{'Error' : 'Missing required field'})
    } 
}

//VERIFY IF A GIVEN ID IS VALID FOR A GIVEN USER

handlers._tokens.verifyToken = function(id,phone,callback){
    //Lookup the token
    _data.read('tokens',id,function(err,tokenData){
        if(!err && tokenData){
            //Check the token has not expired
            if(tokenData.phone == phone && tokenData.expires > Date.now()){
                callback(true)
            } else{
                callback(false)
            }
        } else {
            callback(false)
        }
    })
}


// Checks
handlers.checks = function(data,callback){
  var acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._checks[data.method](data,callback);
  } else {
    callback(405);
  }
};
//Initializing checks containers methods
handlers._checks = {};

//Checks -post
//Required data: protocol, url, method, successCodes, timeoutSeconds
//optional data: none

handlers._checks.post = function(data,callback){
  var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  if(protocol && url && method && successCodes && timeoutSeconds){
    //Get token from headers
      var token = typeof(data.headers.token) == 'string' ? data.headers.token : false

      _data.read('tokens',token,function(err,tokenData){
        if(!err && tokenData){
          var userPhone = tokenData.phone

          //Lookup user data
          _data.read('users',userPhone,function(err,userData){
            if(!err && userData){
              var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
              //Verify user has less than the number of maxChecks per user
              if(userChecks.length < config.maxChecks){
                  //Create a random id for the check
                  var checkId = helpers.createRandomString(20);

                  //Create check object, and include users phone
                  var checkObject = {
                    'id': checkId,
                    'userPhone': userPhone,
                    'protocol': protocol,
                    'url': url,
                    'method': method,
                    'successCodes': successCodes,
                    'timeoutSeconds': timeoutSeconds
                  }

                  _data.create('checks', checkId, checkObject, function(err){
                    if(!err){
                      //Add the checkId to the users Object
                      userData.checks = userChecks;
                      userData.checks.push(checkId);

                      //Save the new user data
                      _data.update('users',userPhone, userData, function(err){
                        if(!err){
                          callback(200, checkObject)
                        } else {
                          callback(500, { 'Error': 'Could not update the user'})
                        }
                      })
                    } else {
                      callback(500, {'Error': 'Could not create new check'})
                    }
                  })
              } else {
                callback(400,{'Error': 'User has maximum number of checks ('+ config.maxChecks +')'})
              }
            }else{
              callback(403)
            }
          })
        } else{
          callback(400)
        }
      })
  } else {
    callback(400, {'Error': 'missing required Inputs'})
  }
}

//Checks -get
//Required data: id
//optional data: none
handlers._checks.get = function(data,callback){
  //Check that id is valid
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
    //Lookup the check
    _data.read('checks',id,function(err,checkData){
      if(!err && checkData){
        //Get the token from headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    //Verify the token provided is valid for the phone number
    handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){

        if(tokenIsValid){
           callback(200, checkData)
        }
        else {
           callback(403)
       }
     })
      }else{
        callback(403,{'Error': "Missing token"})
      }
    })
    
   // Lookup the user
 } else {
   callback(400,{'Error' : 'Missing required field'})
 }
}


//Checks -put
//Required data: id
//optional data: protocol, url, method, successCodes, timeoutSeconds
handlers._checks.put = function(data, callback){
  // Check for the required field
  var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

  //Check for optional fields
  var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  //Check to make sure id is valid
  if(id){
      if (protocol || url || method || successCodes || timeoutSeconds){

        _data.read('checks',id,function(err,checkData){
          if (!err && checkData){
                //Get the token from headers
          var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

          //Verify the token provided is valid for the phone number
          handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){

          if(tokenIsValid){
            //Update checks where necessary
            
            if(protocol){
                checkData.protocol = protocol
            }
            if(url){
              checkData.url = url
            }
            if(method){
              checkData.method = method
            }
            if(successCodes){
              checkData.successCodes = successCodes
            }
            if(timeoutSeconds){
              checkData.timeoutSeconds = successCodes
            }
            _data.update('checks',id,checkData,function(err){
              if(!err){
                callback(200)
              } else {
                callback(500, {'Error': "Could not update "})
              }
            })
          }
          else {
           callback(403)
          }
        })
          } else{
            callback(400)
          }
        })
          
      } else {
        callback(400, {'Error': "Check id does not exist"})
      }
  }else {
    callback(400, {'Error': "Missing required fields to upgrade"})
  }
}


//Checks -delete
//Required data: id
//Optional  data : none
handlers._checks.delete  = function(data, callback){
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
    _data.read('checks',id,function(err,checkData){
      if(!err && checkData){
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
          if(tokenIsValid){
            _data.delete('checks',id,function(err){
              if(!err){
                  _data.read('users',checkData.userPhone,function(err,userData){
                    if(!err && userData){

                      var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                      var checkPosition = userChecks.indexOf(id);
                      if(checkPosition > -1){
                        userChecks.splice(checkPosition,1);
                        _data.update('users',checkData.userPhone,userData,function(err){
                          if(!err){
                            callback(200)
                          } else {
                            callback(500,{'Error': 'Could not delete user'})
                          }
                        })
                      }
                      
                    } else {
                      callback(500, {'Error':'Could not find the specific user'})
                    }
                  })
              } else {
                callback(500, {'Error': 'This sepcified check id does not exist'})
              }
            })
          }
        })
      } else {
        callback(404,{'Error':'Could not delete the check data'})
      }
    })
  }
}

// Export the handlers
module.exports = handlers;