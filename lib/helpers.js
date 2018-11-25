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

// export module
module.exports = helpers;