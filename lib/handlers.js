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
handlers._users.get = function(data, callback){

};

// Users - Delete
handlers._users.delete = function(data, callback){

};

// Users - Post
handlers._users.put = function(data, callback){

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