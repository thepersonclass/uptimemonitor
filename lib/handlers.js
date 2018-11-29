/* 
* Handlers for API
*/

//Dependancies
const _data = require('./data-file-repository');
const helpers = require('./helpers');

// Define handlers
var handlers = {};

// Users handler
handlers.users = function(data, callback){
    
    var acceptedMethods = ['post', 'get', 'put', 'delete'];
    if(acceptedMethods.indexOf(data.method) > -1){
        handlers._users[data.method](data, callback);
    }
    else {
        callback(405);
    }
};

// Containers for the users submethods
handlers._users = {};

// Users - Post
// Required Data: firstname, lastname, phone, password, tosAgreement
// Optional Data: none
handlers._users.post = function(data, callback){
    //Validation
    var firstName = typeof(data.payload.firstName) == 'string' &&  data.payload.firstName.trim().length > 0 ? data.payload.firstName : false;
    var lastName = typeof(data.payload.lastName) == 'string' &&  data.payload.lastName.trim().length > 0 ? data.payload.lastName : false;
    var phone = typeof(data.payload.phone) == 'string' &&  data.payload.phone.trim().length == 10 ? data.payload.phone : false;
    var password = typeof(data.payload.password) == 'string' &&  data.payload.password.trim().length > 0 ? data.payload.password : false;
    var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' &&  data.payload.tosAgreement == true ? true : false;

    if(firstName && lastName && phone && password && tosAgreement){
        // Make sure that the user does not already existing
        _data.read('users', phone, function(error, data){

            if(error){
                // Hash password
                var hashedPassword = helpers.hash(password);
                if(hashedPassword) {
                    //Create the users object
                    var userObject = {
                        'firstName' : firstName,
                        'lastName' : lastName,
                        'phone' : phone,
                        'password' : hashedPassword,
                        'tosAgreement' : true
                    }

                    _data.create('users', phone, userObject, function(error){
                        if(!error){
                            callback(201);
                        }
                        else
                        {
                            console.log(error);
                            callback(500, { 'error' : 'There was an issue creating the user'});
                        }
                    });
                }
                else
                {
                    callback(500, { 'error' : 'Issue hashing password'});
                }               
            }
            else {
                // User already exists
                callback(400, { 'error' : 'This user already exists'});
            }
        });
    }
    else {
        callback(400, { 'Error' : 'Missing required fields'});
    }
};

// Users - Get
// Required Data: Phone number
// Optional Data: None
handlers._users.get = function(data, callback){
    // Check that the phone number provided is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone)
    {
        // Get the token from the header
        var token = typeof(data.headers.token) == 'string' &&  data.headers.token.trim().length == 20 ? data.headers.token : false;

        // Verify that the token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
            if(tokenIsValid){
                // Lookup the user
                _data.read('users', phone, function(error, data){

                    if(!error && data)
                    {
                        // Remove user password before returning to user
                        delete data.hashedPassword;
                        callback(200, data);
                    }
                    else {
                        callback(404);
                    }
                });
            }
            else
            {
                callback(403, { 'error' : 'Missing required token header'});
            }
        });
    }
    else {
        callback(400, { 'error' : 'Missing required field'});
    }

};

// Users - Delete
// Required Data: Phone number
// Optional Data: None
// @TODO - Only allow authenticated user delete there own object
// @TODO - Delete any other files related to user
handlers._users.delete = function(data, callback){
    // Check that the phone number provided is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone)
    {
        // Get the token from the header
         var token = typeof(data.headers.token) == 'string' &&  data.headers.token.trim().length == 20 ? data.headers.token : false;

         // Verify that the token is valid for the phone number
         handlers._tokens.verifyToken(token, phone, function(tokenIsValid)
         {
             if(tokenIsValid)
             {
                 // Delete the user
                _data.delete('users', phone, function(error){
                    if(!error)
                    {
                        callback(200);
                    }
                    else {
                        callback(500, { 'error' : 'There was an issue deleting the user'});
                    }
                });
             }
             else
             {
                callback(403, { 'error' : 'Missing required token header'});
             }
        });
    }
    else {
        callback(400, { 'error' : 'Missing required field'});
    }
};

// Users - Put
// Required - Phone
// Optional - firstName, lastName, password at least one should be specified
handlers._users.put = function(data, callback){
    // Check that the phone number is provided is valid
    var phone = typeof(data.payload.phone) == 'string' &&  data.payload.phone.trim().length == 10 ? data.payload.phone : false;
    if(phone)
    {
         // Get the token from the header
         var token = typeof(data.headers.token) == 'string' &&  data.headers.token.trim().length == 20 ? data.headers.token : false;

         // Verify that the token is valid for the phone number
         handlers._tokens.verifyToken(token, phone, function(tokenIsValid)
         {
             if(tokenIsValid)
             {
                // Lookup the user
                _data.read('users', phone, function(error, userData)
                {
                    if(!error && userData)
                    {
                        var firstName = typeof(data.payload.firstName) == 'string' &&  data.payload.firstName.trim().length > 0 ? data.payload.firstName : false;
                        var lastName = typeof(data.payload.lastName) == 'string' &&  data.payload.lastName.trim().length > 0 ? data.payload.lastName : false;
                        var password = typeof(data.payload.password) == 'string' &&  data.payload.password.trim().length > 0 ? data.payload.password : false;
                        if(firstName || lastName || password)
                        {
                            // Update fields
                            if(firstName){
                                userData.firstName = firstName;
            
                            }
                            if(lastName){
                                userData.lastName = lastName;
            
                            }
                            if(password){
                                userData.hashedPassword = helpers.hash(password);
                            }
                        }
                        else 
                        {
                            callback(400, { 'error' : 'Missing field to update'});
                        }

                        // Store new updates
                        _data.update('users', phone, userData, function(error)
                        {
                            if(!error)
                            {
                                callback(200);
                            }
                            else
                            {
                                callback(500, { 'error' : 'Could not update user'});
                            }
                        });
                    }
                    else 
                    {
                        callback(400, 'User is not found');
                    }
                });
            }
            else
            {
                callback(403, { 'error' : 'Missing required token header'});
            }
        });
    }
    else 
    {
        callback(400, { 'error' : 'Missing required field'});
    }

};

// Tokens handler
handlers.tokens = function(data, callback){
    
    var acceptedMethods = ['post', 'get', 'put', 'delete'];
    if(acceptedMethods.indexOf(data.method) > -1){
        handlers._tokens[data.method](data, callback);
    }
    else {
        callback(405);
    }
};

handlers._tokens = {};

// Tokens - post
// Required - phone, password
// Optional - None
handlers._tokens.post = function(data, callback){
    // Validation
    var phone = typeof(data.payload.phone) == 'string' &&  data.payload.phone.trim().length == 10 ? data.payload.phone : false;
    var password = typeof(data.payload.password) == 'string' &&  data.payload.password.trim().length > 0 ? data.payload.password : false;

    if(phone && password) {
        
        // Lookup the user
        _data.read('users', phone, function(error, usersData){

            if(!error && usersData)
            {              
                var hashedPassword = helpers.hash(password)
                if(hashedPassword == usersData.password){
                    
                    //if valid, create token with random name. Set expiration for 1 hour
                    var tokenId = helpers.createRandomString(20);
                    var expires = Date.now() + 1000 * 60 * 60;

                    var tokenObject = {
                        'phone' : phone,
                        'id' : tokenId,
                        'expires' : expires
                    };

                    _data.create('tokens', tokenId, tokenObject, function(error) {

                        if(!error)
                        {
                            callback(200, tokenObject);
                        }
                        else 
                        {
                            callback(500, { 'error' : 'Could not create token'});
                        }
                    });
                }
                else
                {
                    callback(400, { 'error' : 'Does not match password'});
                }
            }
            else 
            {
                callback(400, { 'error' : 'Could not find user'});
            }
        });
    }
    else 
    {
        callback(400, { 'error' : 'Missing required field(s)'});
    }
};

// Tokens - Get
// Required: id
// Optional: none
handlers._tokens.get = function(data, callback){
    // Check that the token provided is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id)
    {
        // Lookup the token
        _data.read('tokens', id, function(error, tokenData){

            if(!error && tokenData)
            {
                callback(200, tokenData);
            }
            else {
                callback(404);
            }
        });
    }
    else {
        callback(400, { 'error' : 'Missing required field'});
    }
};

// Tokens - Put
// Required: id, extend
// Optional: None
handlers._tokens.put = function(data, callback){
    // Validation
    var id = typeof(data.payload.id) == 'string' &&  data.payload.id.trim().length == 20 ? data.payload.id : false;
    var extend = typeof(data.payload.extend) == 'boolean' ? data.payload.extend : false;

    if(id && extend)
    {
        // Lookup the token
        _data.read('tokens', id, function(error, tokenData){

            if(!error && tokenData)
            {
                if(tokenData.expires > Date.now())
                {
                    var expires = Date.now() + 1000 * 60 * 60;
                    tokenData.expires = expires;
                    _data.update('tokens', id, tokenData, function(error){

                        if(!error)
                        {
                            callback(200);
                        }
                        else
                        {
                            callback(500, { 'error' : 'Could not update token'});
                        }
                    });
                }
                else
                {
                    callback(400, { 'error' : 'Token has not expired yet'});
                }
            }
            else {
                callback(404);
            }
        });
    }
    else {
        callback(400, { 'error' : 'Missing required field'});
    }
};

// Token - Delete
// Required: Id
// Optional: none
handlers._tokens.delete = function(data, callback){
    // Check that the token provided is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id)
    {
        // Lookup the token
        _data.delete('tokens', id, function(error){
            if(!error)
            {
                callback(200);
            }
            else {
                callback(500, { 'error' : 'There was an issue deleting the token'});
            }
        });
    }
    else {
        callback(400, { 'error' : 'Missing required field'});
    }
};

// Verifies a given token
handlers._tokens.verifyToken = function(id, phone, callback) {
    // Check that the token provided is valid
    var id = typeof(id) == 'string' && id.trim().length == 20 ? id.trim() : false;
    if(id)
    {
        // Lookup the token
        _data.read('tokens', id, function(error, tokenData){
            if(!error && tokenData)
            {
                // Check if a token is for a given user and not expired
                if(tokenData.phone == phone && tokenData.expires > Date.now())
                {
                    callback(true);
                }
                else {
                    callback(false);
                }
            }
        });
    }
    else 
    {
        return false;
    }
};

// Ping handler
handlers.ping = function(data, callback){
    callback(200);
};

// Not found handler
handlers.notFound = function(data, callback){
    callback(404);
};

// Export the handlers
module.exports = handlers;