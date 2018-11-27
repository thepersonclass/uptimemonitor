/*
* Helpers for various tasks
*/

// Dependancies
const crypto = require('crypto');
const config = require('./config');

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
}

// export module
module.exports = helpers;