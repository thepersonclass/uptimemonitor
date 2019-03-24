/*
* Server related tasks
*
*/

// Dependancies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');

//Server object
let server = {};

// Create the http server
server.httpServer = http.createServer(function(request, response){
    server.unifiedServer(request, response);
});

// Create the https server
server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, function(request, response){
    server.unifiedServer(request, response);
});

// All server logic for both http and https createServer
server.unifiedServer = function(request, response){

    // Get Url and parse it
    var parsedUrl = url.parse(request.url, true);

    // Get the path
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get query string as an object
    var queryStringObject = parsedUrl.query;

    // Get Http Method
    var method = request.method.toLocaleLowerCase();

    // Get headers as object
    var headers = request.headers;

    // Get payload, if any
    var decoder = new StringDecoder('utf-8');
    var buffer = '';
    request.on('data', function(data){
        buffer += decoder.write(data);
    });
    request.on('end', function(){
        buffer += decoder.end();

        // Choose the handler this request should go to, if none is found go to not found handler
        var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

        //If within public dir use the public handler
        chosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;

        // Construct data object to send to the handler
        var data = {
            'trimmedPath': trimmedPath,
            'method' : method,
            'headers' : headers,
            'queryStringObject' : queryStringObject,
            'payload' : helpers.parseJsonToObject(buffer)
        };

        // Route request to specified handler
        chosenHandler(data, function(statusCode, payload, contentType){

            //Determine the type of response (fallback to JSON)
            contentType = typeof(contentType) == 'string' ? contentType : 'json';

            // Use the status code called back by the handler, or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // Return the response parts that are content-specific
            var payloadString = '';
            if(contentType == 'json'){
                response.setHeader('Content-Type', 'application/json');
                payload = typeof(payload) == 'object' ? payload : {};
                payloadString = JSON.stringify(payload);
            }
            if(contentType == 'html'){
                response.setHeader('Content-Type', 'text/html');
                payloadString = typeof(payload) == 'string' ? payload : '';
            }
            if(contentType == 'favicon'){
                response.setHeader('Content-Type', 'image/x-icon');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }
            if(contentType == 'css'){
                response.setHeader('Content-Type', 'text/css');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }
            if(contentType == 'png'){
                response.setHeader('Content-Type', 'image/png');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }
            if(contentType == 'jpg'){
                response.setHeader('Content-Type', 'image/jpg');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }
            if(contentType == 'plain'){
                response.setHeader('Content-Type', 'text/plain');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }

            //Return the response-parts that are common to all content-types
            response.writeHead(statusCode);
            response.end(payloadString);

            //If status code is 200, otherwise log in red
            if(statusCode == '200'){
                debug('\x1b[32m%s\x1b[0m', method.toUpperCase()+' /'+ trimmedPath+' '+statusCode);
            }
            else {
                debug('\x1b[31m%s\x1b[0m', method.toUpperCase()+' /'+ trimmedPath+' '+statusCode);
            }
        });
    });
};

// Define a request router
server.router = {
    '' : handlers.index,
    'account/create' : handlers.accountCreate,
    'account/edit' : handlers.accountEdit,
    'account/deleted' : handlers.accountDeleted,
    'session/create' : handlers.sessionCreate,
    'session/deleted' : handlers.sessionDeleted,
    'checks/all' : handlers.checksList,
    'checks/create' : handlers.checksCreate,
    'checks/edit': handlers.checksEdit,
    'ping': handlers.ping,
    'api/users': handlers.users,
    'api/tokens': handlers.tokens,
    'api/checks': handlers.checks,
    'favicon.ico': handlers.favicon,
    'public': handlers.public
};

//Server Initialization
server.init = function(){
    // Start the http server, and have it listen on port 3000
    server.httpServer.listen(config.httpPort, function(){
        //Send to console in pink
        console.log('\x1b[35m%s\x1b[0m', "We are instantiating the http server "+config.httpPort);
    });

    // We want to start the https server
    server.httpsServer.listen(config.httpsPort, function(){
        //Send to console in blue
        console.log('\x1b[36m%s\x1b[0m', "We are instantiating the https server "+config.httpsPort);
    });
};

//Export the server
module.exports = server;