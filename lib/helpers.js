/*
* Helpers for various tasks
*/

// Dependancies
const crypto = require('crypto');
const config = require('./config');
const querystring = require('querystring');
const https = require('https');

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

// export module
module.exports = helpers;