/*
* Helpers for various tasks
*/

// Dependancies
const crypto = require('crypto');
const config = require('./config');
const querystring = require('querystring');
const https = require('https');
var path = require('path');
var fs = require('fs');

var helpers = {};

helpers.hash = function(data){

    if(typeof(data) == 'string' && data.length > 0){
        var hash = crypto.createHmac('sha256', config.hashingSecret).update(data).digest('hex');
        return hash;
    }
    else 
    {
        return false;
    }
};

// Parse Json to Object
helpers.parseJsonToObject = function(data){
    try
    {
        var obj = JSON.parse(data);
        return obj;
    }
    catch(e)
    {
        return {};
    }
};

// Creates a string of random alpha numeric characters of a determined length
helpers.createRandomString = function(stringLength){
    stringLength = typeof(stringLength) == 'number' && stringLength > 0 ? stringLength : false;
    if(stringLength)
    {
        var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

        // Start the final string
        var str = '';
        for(i = 1; i <= stringLength; i++)
        {
            // Get random character from string
            var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

            str+=randomCharacter;
        }

        return str;
    }
    else
    {
        return false;
    }
};

helpers.sendTwilioSms = function(phone, message, callback){
    phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    message = typeof(message) == 'string' && message.trim().length > 0 && message.trim().length <= 1600 ? message.trim() : false;

    if(phone && message){
        //Configure the request payload
        let payload = {
            'From': '1'+config.twilio.fromPhone,
            'To': '1'+phone,
            'Body': message
        };

        //Stringify paylod
        const stringPayload = querystring.stringify(payload);
        console.log(stringPayload);
        //Configure request
        const requestDetails = {
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
            'auth': config.twilio.accountSid+':'+config.twilio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            } 
        };

        //Create the request object
        const request = https.request(requestDetails,function(response){
            //Grab the status of the request
            var status = response.statusCode;
            if(status == 200 || status == 201){
                 callback(false);
            }
            else {
                callback('Status code was '+ status);
            }
        });

        //Bind to error to event so it doesn't get thrown
        request.on('error', function(e){
            callback(e);
        });

        //Add payload
        request.write(stringPayload);

        //End request
        request.end();
    }
    else {
        callback('Given parameters are missing or invalid');
    }
};

//Get the string content of a template
helpers.getTemplate = function(templateName, data, callback){
    templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
    data = typeof(data) == 'object' && data !== null ? data : {};

    if(templateName){
        var templateDir = path.join(__dirname, '/../templates/');
        fs.readFile(templateDir+templateName+'.html','utf8',function(err, str){
            if(!err && str && str.length > 0){
                //Do interpolate
                var finalString = helpers.interpolate(str, data);
                callback(false,finalString);
            }
            else{
                callback('No template could be found');
            }
        });
    }
    else{
        callback('A valid templatr name was not specified')
    }
};

//Add the universal header and footer to a string, and add all data
helpers.addUniversalTemplates = function(str, data, callback){
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data !== null ? data : {}; 

    //Header
    helpers.getTemplate('_header', data, function(err, headerString){
        if(!err && headerString){
            //Footer
            helpers.getTemplate('_footer', data, function(err, footerString){
                if(!err && footerString){
                    var fullString = headerString+str+footerString;
                    callback(false, fullString);
                }
                else{
                    callback('Could not find the footer template');
                }
            });
        }
        else{
            callback('Could not find header');
        }
    })
}

//Take a given string and a data object and find / replace all the keys within it
helpers.interpolate = function(str, data){
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data !== null ? data : {};

    //Add the templatedGlobaks to the data object, prepairing their key with "global"
    for(var keyName in config.templatedGlobals){
        if(config.templatedGlobals.hasOwnProperty(keyName)){
            data['global.'+keyName] = config.templatedGlobals[keyName];
        }
    }

    //Replace
    for(var key in data){
        if(data.hasOwnProperty(key) && typeof(data[key]) == 'string'){
            var replace = data[key];
            var find = '{'+key+'}';
            str = str.replace(find, replace);
        }
    }

    return str;
}

//Get the contents of a statuc asset
helpers.getStaticAsset = function(fileName, callback){
    fileName = typeof(fileName) == 'string' && fileName.length > 0 ? fileName : false;
    if(fileName){
        var publicDir = path.join(__dirname, '/../public/');
        fs.readFile(publicDir+fileName,function(err,data){
            if(!err && data){
                callback(false, data);
            }
            else {
                callback('No file found');
            }
        });
    }
    else{
        callback('A valid file name was not specified');
    }
}

// export module
module.exports = helpers;