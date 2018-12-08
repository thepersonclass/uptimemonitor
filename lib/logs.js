/*
* Logs to the files system and rotates logs
*/

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

let lib = {};

// Base directory of the logs folder
lib.baseDirectory = path.join(__dirname, '/../.logs/');

//Append string to file, create the file if it doesn't exist
lib.append = function(logFileName, logString, callback){
     // Open file for writing
     fs.open(lib.baseDirectory+logFileName+'.log', 'a', function(error, fileDescriptor){

        if(!error && fileDescriptor){
            fs.appendFile(fileDescriptor, logString+'\n', function(error){

                if(!error){
                    fs.close(fileDescriptor, function(error){
                        if(!error){
                            callback(false);
                        } 
                        else {
                            callback('Error closing file that was being appended');
                        }
                    });
                } 
                else {
                    callback('There was an issue appending to log file');
                }
            });
        } 
        else {
            callback('There was an issue creating the file, it might already exist');
        }
    });
};

//List all log files
lib.list = function(includeCompressLogs, callback){
    fs.readdir(lib.baseDirectory, function(error, data){
        if(!error && data && data.length > 0){
            let trimmedFileNames = [];
            data.forEach(fileName => {
                //Add the .log files
                if(fileName.indexOf('.log') > -1){
                    trimmedFileNames.push(fileName.replace('.log', ''));
                }

                //Add on .gz files
                if(fileName.indexOf('.gz.b64') > -1 && includeCompressLogs){
                    trimmedFileNames.push(fileName.replace('.gz.b64', ''));
                }
            });

            callback(false, trimmedFileNames);
        }
        else {
            callback(error, data);
        }
    });
};

//Compress the contents of a log file into .gz.b64 with in the same directory
lib.compress = function(logId, newFileId, callback){
    const sourceFile = logId+'.log';
    const destinationFile = newFileId+'.gz.b64';

    //Read the source file
    fs.readFile(lib.baseDirectory+sourceFile, 'utf8', function(error, inputString){
        if(!error && inputString){
            //Compress the data using gzip
            zlib.gzip(inputString, function(error, buffer){
                if(!error && buffer){
                     // Open file for writing
                        fs.open(lib.baseDirectory+destinationFile, 'wx', function(error, fileDescriptor){

                            if(!error && fileDescriptor){
                                fs.writeFile(fileDescriptor, buffer.toString('base64'), function(error){
                                    if(!error){
                                        fs.close(fileDescriptor, function(error){
                                            if(!error){
                                                callback(false);
                                            } 
                                            else {
                                                callback('Error closing file that was being compressed');
                                            }
                                        });
                                    } 
                                    else {
                                        callback('There was an issue compressing to file');
                                    }
                                });
                            } 
                            else {
                                callback('There was an issue compressing the filet');
                            }
                        });
                }
                else {
                    callback(error);
                }
            });
        }
        else{
            callback(error);
        }
    });
};

//Decompress the contents of a .gz.b64 file into a string let
lib.decompress = function(fileId, callback){
    const fileName = fileId+'.gz.b64';
    
    //Read the source file
    fs.readFile(lib.baseDirectory+fileName, 'utf8', function(error, inputString){
        if(!error && inputString){
            //Decompress data
            let inputBuffer = Buffer.from(inputString, 'base64');
            zlib.unzip(inputBuffer, function(error, outputBuffer){
                if(!error && outputBuffer){
                    //Callback
                    let str = outputBuffer.toString();
                    callback(false, str);
                }
                else {
                    callback(error);
                }
            })
        }

    });
}

//Truncates logs
lib.truncate = function(logId, callback){
    fs.truncate(lib.baseDirectory+logId+'.log', function(error){
        if(!error){
            callback(false);
        }
        else {
            callback(error);
        }
    })
}

//Export module
module.exports = lib;