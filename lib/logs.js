/*
*
*Library for storing and rotating logs
*
*/

//Dependencies
var fs = require('fs');
var path = require('path');
//zlib is used for compressing files
var zlib = require('zlib');
const lib = require('./data');

//container for logs module
var logs = {}


//Base directory for the logs folder
lib.Dir = path.join(__dirname,'/../.logs/');

//Append the string to a file. check if the file does not exist
lib.append = function(file,str,callback){

    //Open the file for append
    fs.open(lib.Dir+'.log','a',function(err,fileDescriptor){
        if(!err && fileDescriptor){
            //Append the file and close it
            fs.appendFile(fileDescriptor,str+'\n',function(err){
                if(!err){
                    fs.close(fileDescriptor,function(err){
                        if(!err){
                            callback(false)
                        }else{
                            callback('Error closing file that was appended')
                        }
                    })
                } else {
                    callback('Error appending to the file');
                }
            })
        } else {
            callback("Could not file the file for appending")
        }
    })
}







//Export the module
module.exports = logs;