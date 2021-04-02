/*
*Library for starting and editing data
*/

//Dependencies
var fs = require('fs');
var path = require('path');

//Container for the module to be exported

var lib = {}
// Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/')

//WRITE TO A FILE (POST REQUEST)
lib.create = function(dir,file,data,callback){
    //OPEN FILE FOR WRITING
    fs.open(lib.baseDir+dir+'/'+file+'.json','wx',function(err,fileDescriptor){
        if(!err && fileDescriptor){
            //Convert to a string
            var stringData =JSON.stringify(data)

            //Write to file and close it
            fs.writeFile(fileDescriptor,stringData, function(err){
                if(!err){
                    fs.close(fileDescriptor,function(err){
                        if(!err){
                            callback(false)
                        }else{
                            callback('Error writing to new file')
                        }
                    })
                }
                else{
                    callback('Error writing to new file')
                }
            })
        }
        else {
            callback('could not create file , it may already exists');
        }
    })
}


/// READ DATA FROM A FILE (GET REQUEST)
lib.read = function(dir,file,callback){
    fs.readFile(lib.baseDir+dir+'/'+file+'.json','utf8',function(err,data){
        callback(err,data);
    })
}


//UPDATE DATA INSIDE A FILE (PATCH REQUEST)
lib.update = function(dir,file,data,callback){
    //OPEN THE FILE FOR WRITING
    fs.open(lib.baseDir+dir+'/'+file+'.json','r+',function(err,fileDescriptor){
        if(!err & fileDescriptor){
            //CONVERT DATA TO STRING
            var stringData = JSON.stringify(data)

            //TRUNCATE THE FILE
            fs.truncate(fileDescriptor, function(err){
                if(!err){
                    fs.writeFile(fileDescriptor,stringData,function(err){
                        if(!err){
                            fs.close(fileDescriptor,function(err){
                               if(!err){
                                   callback(false)
                               } else {
                                   callback ('error closing the file')
                               }
                            })
                        }
                    })
                }
            })
        }
        else{
            callback('could not open file for updating, it might not exist yet')
        }
    })
}

//DELETE A FILE(DELETE REQUEST)
lib.delete =function(dir,file,callback){
    fs.unlink(lib.baseDir+dir+'/'+file+'.json', function(err){
        if(!err){
            callback(false)
        }
        else{
            callback('File was not deleted');
        }

    })
}


//EXPORTING THE MODULE
module.exports = lib;