/* 
* Handlers for API
*/

//Dependancies
const _data = require('./data-file-repository');
const helpers = require('./helpers');
const config = require('./config');

// Define handlers
var handlers = {};

// Users handler
handlers.users = function (data, callback) {

    var acceptedMethods = ['post', 'get', 'put', 'delete'];
    if (acceptedMethods.indexOf(data.method) > -1) {
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
handlers._users.post = function (data, callback) {
    //Validation
    var firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName : false;
    var lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName : false;
    var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone : false;
    var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password : false;
    var tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        // Make sure that the user does not already existing
        _data.read('users', phone, function (error, data) {

            if (error) {
                // Hash password
                var hashedPassword = helpers.hash(password);
                if (hashedPassword) {
                    //Create the users object
                    var userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phone': phone,
                        'password': hashedPassword,
                        'tosAgreement': true
                    }

                    _data.create('users', phone, userObject, function (error) {
                        if (!error) {
                            callback(201);
                        }
                        else {
                            console.log(error);
                            callback(500, { 'error': 'There was an issue creating the user' });
                        }
                    });
                }
                else {
                    callback(500, { 'error': 'Issue hashing password' });
                }
            }
            else {
                // User already exists
                callback(400, { 'error': 'This user already exists' });
            }
        });
    }
    else {
        callback(400, { 'Error': 'Missing required fields' });
    }
};

// Users - Get
// Required Data: Phone number
// Optional Data: None
handlers._users.get = function (data, callback) {
    // Check that the phone number provided is valid
    var phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if (phone) {
        // Get the token from the header
        var token = typeof (data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token : false;

        // Verify that the token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
            if (tokenIsValid) {
                // Lookup the user
                _data.read('users', phone, function (error, data) {

                    if (!error && data) {
                        // Remove user password before returning to user
                        delete data.hashedPassword;
                        callback(200, data);
                    }
                    else {
                        callback(404);
                    }
                });
            }
            else {
                callback(403, { 'error': 'Missing required token header' });
            }
        });
    }
    else {
        callback(400, { 'error': 'Missing required field' });
    }

};

// Users - Delete
// Required Data: Phone number
// Optional Data: None
handlers._users.delete = function (data, callback) {
    // Check that the phone number provided is valid
    var phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if (phone) {
        // Get the token from the header
        var token = typeof (data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token : false;

        // Verify that the token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
            if (tokenIsValid) {
                _data.read('users', phone, function (error, userData) {
                    if (!error && userData) {
                        // Delete the user
                        _data.delete('users', phone, function (error) {
                            if (!error) {
                                //Delete all checks associated with user
                                const userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                                const userChecksToDelete = userChecks.length;
                                if (userChecksToDelete > 0) {
                                    let checksDeleted = 0;
                                    let deletionErrors = false;
                                    //loop through checks
                                    userChecks.forEach(checkId => {
                                        _data.delete('checks', checkId, function (error) {
                                            if (error) {
                                                deletionErrors = true;
                                            }
                                            checksDeleted++;
                                            if (checksDeleted == userChecksToDelete) {
                                                if (!deletionErrors) {
                                                    callback(200);
                                                }
                                                else {
                                                    callback(500, { 'error': 'Error happend when deleting checks' });
                                                }
                                            }
                                        });
                                    });
                                }
                                else {
                                    callback(200);
                                }
                            }
                            else {
                                callback(500, { 'error': 'There was an issue deleting the user' });
                            }
                        });
                    }
                    else {
                        callback(404, {'message':'User was not found'});
                    }
                });
            }
            else {
                callback(403, { 'error': 'Missing required token header' });
            }
        });
    }
    else {
        callback(400, { 'error': 'Missing required field' });
    }
};

// Users - Put
// Required - Phone
// Optional - firstName, lastName, password at least one should be specified
handlers._users.put = function (data, callback) {
    // Check that the phone number is provided is valid
    var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone : false;
    if (phone) {
        // Get the token from the header
        var token = typeof (data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token : false;

        // Verify that the token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
            if (tokenIsValid) {
                // Lookup the user
                _data.read('users', phone, function (error, userData) {
                    if (!error && userData) {
                        var firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName : false;
                        var lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName : false;
                        var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password : false;
                        if (firstName || lastName || password) {
                            // Update fields
                            if (firstName) {
                                userData.firstName = firstName;

                            }
                            if (lastName) {
                                userData.lastName = lastName;

                            }
                            if (password) {
                                userData.hashedPassword = helpers.hash(password);
                            }
                        }
                        else {
                            callback(400, { 'error': 'Missing field to update' });
                        }

                        // Store new updates
                        _data.update('users', phone, userData, function (error) {
                            if (!error) {
                                callback(200);
                            }
                            else {
                                callback(500, { 'error': 'Could not update user' });
                            }
                        });
                    }
                    else {
                        callback(400, 'User is not found');
                    }
                });
            }
            else {
                callback(403, { 'error': 'Missing required token header' });
            }
        });
    }
    else {
        callback(400, { 'error': 'Missing required field' });
    }

};

// Tokens handler
handlers.tokens = function (data, callback) {

    var acceptedMethods = ['post', 'get', 'put', 'delete'];
    if (acceptedMethods.indexOf(data.method) > -1) {
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
handlers._tokens.post = function (data, callback) {
    // Validation
    var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone : false;
    var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password : false;

    if (phone && password) {

        // Lookup the user
        _data.read('users', phone, function (error, usersData) {

            if (!error && usersData) {
                var hashedPassword = helpers.hash(password)
                if (hashedPassword == usersData.password) {

                    //if valid, create token with random name. Set expiration for 1 hour
                    var tokenId = helpers.createRandomString(20);
                    var expires = Date.now() + 1000 * 60 * 60;

                    var tokenObject = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': expires
                    };

                    _data.create('tokens', tokenId, tokenObject, function (error) {

                        if (!error) {
                            callback(200, tokenObject);
                        }
                        else {
                            callback(500, { 'error': 'Could not create token' });
                        }
                    });
                }
                else {
                    callback(400, { 'error': 'Does not match password' });
                }
            }
            else {
                callback(400, { 'error': 'Could not find user' });
            }
        });
    }
    else {
        callback(400, { 'error': 'Missing required field(s)' });
    }
};

// Tokens - Get
// Required: id
// Optional: none
handlers._tokens.get = function (data, callback) {
    // Check that the token provided is valid
    var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        // Lookup the token
        _data.read('tokens', id, function (error, tokenData) {

            if (!error && tokenData) {
                callback(200, tokenData);
            }
            else {
                callback(404);
            }
        });
    }
    else {
        callback(400, { 'error': 'Missing required field' });
    }
};

// Tokens - Put
// Required: id, extend
// Optional: None
handlers._tokens.put = function (data, callback) {
    // Validation
    var id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id : false;
    var extend = typeof (data.payload.extend) == 'boolean' ? data.payload.extend : false;

    if (id && extend) {
        // Lookup the token
        _data.read('tokens', id, function (error, tokenData) {

            if (!error && tokenData) {
                if (tokenData.expires > Date.now()) {
                    var expires = Date.now() + 1000 * 60 * 60;
                    tokenData.expires = expires;
                    _data.update('tokens', id, tokenData, function (error) {

                        if (!error) {
                            callback(200);
                        }
                        else {
                            callback(500, { 'error': 'Could not update token' });
                        }
                    });
                }
                else {
                    callback(400, { 'error': 'Token has not expired yet' });
                }
            }
            else {
                callback(404);
            }
        });
    }
    else {
        callback(400, { 'error': 'Missing required field' });
    }
};

// Token - Delete
// Required: Id
// Optional: none
handlers._tokens.delete = function (data, callback) {
    // Check that the token provided is valid
    var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        // Lookup the token
        _data.delete('tokens', id, function (error) {
            if (!error) {
                callback(200);
            }
            else {
                callback(500, { 'error': 'There was an issue deleting the token' });
            }
        });
    }
    else {
        callback(400, { 'error': 'Missing required field' });
    }
};

// Verifies a given token
handlers._tokens.verifyToken = function (id, phone, callback) {
    // Check that the token provided is valid
    var id = typeof (id) == 'string' && id.trim().length == 20 ? id.trim() : false;
    if (id) {
        // Lookup the token
        _data.read('tokens', id, function (error, tokenData) {
            if (!error && tokenData) {
                // Check if a token is for a given user and not expired
                if (tokenData.phone == phone && tokenData.expires > Date.now()) {
                    callback(true);
                }
                else {
                    callback(false);
                }
            }
        });
    }
    else {
        return false;
    }
};

// Checks handler
handlers.checks = function (data, callback) {

    var acceptedMethods = ['post', 'get', 'put', 'delete'];
    if (acceptedMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method](data, callback);
    }
    else {
        callback(405);
    }
};

// Containers for the checks submethods
handlers._checks = {};

//Checks - post
// Required: Protocal, url, method, successCodes, timeoutSeconds
handlers._checks.post = function (data, callback) {
    //Validation
    const protocal = typeof (data.payload.protocal) == 'string' && ['https', 'http'].indexOf(data.payload.protocal) > -1 ? data.payload.protocal : false;
    const url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    const method = typeof (data.payload.method) == 'string' && ['post', 'put', 'delete', 'get'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    const successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    const timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (protocal && url && method && successCodes && timeoutSeconds) {
        // Get token from the headers
        const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

        // Lookup user by reading token
        _data.read('tokens', token, function (error, tokenData) {
            if (!error && tokenData) {
                const userPhone = tokenData.phone;

                _data.read('users', userPhone, function (error, userData) {
                    if (!error && userData) {
                        const userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                        //Verify that the user is under the max checks
                        if (userChecks.length < config.maxChecks) {
                            //Create a random id for the check
                            const checkId = helpers.createRandomString(20);

                            //Create check object and include user's phone
                            const checkObject = {
                                'id': checkId,
                                'userPhone': userPhone,
                                'protocol': protocal,
                                'url': url,
                                'method': method,
                                'successCodes': successCodes,
                                'timeoutSeconds': timeoutSeconds
                            };

                            _data.create('checks', checkId, checkObject, function (error) {
                                if (!error) {
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);

                                    //Update user data
                                    _data.update('users', userData.phone, userData, function (error) {
                                        if (!error) {
                                            //Send check object back to user
                                            callback(201, checkObject);
                                        }
                                        else {
                                            callback(500, { 'error': 'There was an issue updating user data' });
                                        }
                                    });
                                }
                                else {
                                    callback(500, { 'error': 'There was an issue saving check' });
                                }
                            });
                        }
                        else {
                            callback(400, { 'error': 'You have hit your max number of checks, which is ' + config.maxChecks });
                        }
                    }
                    else {
                        callback(403);
                    }
                });
            }
            else {
                callback(403);
            }
        });
    }
    else {
        callback(400, { 'error': 'Missing required fields or they are invalid' });
    }
};

//Check - get
//Required: id
//Optional: none
handlers._checks.get = function (data, callback) {
    //Validation
    const id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

    // Get the token from the header
    var token = typeof (data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token : false;

    //Read check data
    _data.read('checks', id, function (error, checkData) {
        if (!error && checkData) {
            // Verify that the token is valid for the phone number
            handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
                if (tokenIsValid) {
                    callback(200, checkData);
                }
                else {
                    callback(403, { 'error': 'Missing token header' });
                }
            });
        }
        else {
            callback(404, { 'message': 'Could not find check by id ' + id });
        }
    });
};

//Checks - put
//Required - id
//Optional - protocal, method, url, timeoutSeconds, successCodes
handlers._checks.put = function (data, callback) {
    // Check that the check id is provided is valid
    const checkId = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    if (checkId) {
        // Get the token from the header
        const token = typeof (data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token : false;

        // Lookup the check
        _data.read('checks', checkId, function (error, checkData) {
            if (!error && checkData) {

                // Verify that the token is valid for the phone number
                handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
                    if (tokenIsValid) {
                        //Validation
                        const protocal = typeof (data.payload.protocal) == 'string' && ['https', 'http'].indexOf(data.payload.protocal) > -1 ? data.payload.protocal : false;
                        const url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
                        const method = typeof (data.payload.method) == 'string' && ['post', 'put', 'delete', 'get'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
                        const successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
                        const timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

                        if (protocal || url || method || successCodes || timeoutSeconds) {
                            // Update fields
                            if (protocal) {
                                checkData.protocal = protocal;

                            }
                            if (url) {
                                checkData.url = url;

                            }
                            if (method) {
                                checkData.method = method;
                            }
                            if (successCodes) {
                                checkData.successCodes = successCodes;

                            }
                            if (timeoutSeconds) {
                                checkData.timeoutSeconds = timeoutSeconds;
                            }
                        }
                        else {
                            callback(400, { 'error': 'Missing field to update' });
                        }

                        // Store new updates
                        _data.update('checks', checkId, checkData, function (error) {
                            if (!error) {
                                callback(200);
                            }
                            else {
                                callback(500, { 'error': 'Could not update check' });
                            }
                        });
                    }
                    else {
                        callback(403, { 'error': 'Missing required token header' });
                    }
                });

            }
            else {
                callback(400, 'Check is not found');
            }
        });
    }
    else {
        callback(400, { 'error': 'Missing required field' });
    }
};

//Checks - delete
//Required - id
//Optional - none
handlers._checks.delete = function (data, callback) {
    // Check that the id provided is valid
    var checkId = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (checkId) {
        //Read check data
        _data.read('checks', checkId, function (error, checkData) {
            if (!error && checkData) {
                // Get the token from the header
                var token = typeof (data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token : false;
                // Verify that the token is valid for the phone number
                handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
                    if (tokenIsValid) {
                        _data.delete('checks', checkId, function (error) {
                            if (!error) {
                                _data.read('users', checkData.userPhone, function (error, userData) {
                                    if (!error && userData) {
                                        const userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                                        //Remove user check from user data
                                        var checkPosition = userChecks.indexOf(checkId);
                                        if (checkPosition != -1) {
                                            userChecks.splice(checkPosition, 1);
                                            //Re-Save users data
                                            _data.update('users', checkData.userPhone, userData, function (error) {
                                                if (!error) {
                                                    callback(200);
                                                }
                                                else {
                                                    callback(500, { 'error': 'Failed to remove check from user data' });
                                                }
                                            })
                                        }
                                        else {
                                            callback(500, { 'error': 'Failed to remove check from user data' });
                                        }
                                    }
                                    else {
                                        callback(500, { 'error': 'Failed to remove check from user data' });
                                    }
                                });
                            }
                            else {
                                callback(500, { 'error': 'There was an issue deleting the check ' + checkId });
                            }
                        });
                    }
                    else {
                        callback(403, { 'error': 'Missing required token header' });
                    }
                });
            }
            else {
                callback(404, { 'message': 'Could not find check by id ' + checkId });
            }
        });
    }
    else {
        callback(400, { 'error': 'Missing required field' });
    }
};

// Ping handler
handlers.ping = function (data, callback) {
    callback(200);
};

// Not found handler
handlers.notFound = function (data, callback) {
    callback(404);
};

// Export the handlers
module.exports = handlers;