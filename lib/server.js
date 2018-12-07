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

        // Construct data object to send to the handler
        var data = {
            'trimmedPath': trimmedPath,
            'method' : method,
            'headers' : headers,
            'queryStringObject' : queryStringObject,
            'payload' : helpers.parseJsonToObject(buffer)
        };

        // Route request to specified handler
        chosenHandler(data, function(statusCode, payload){

            // Use the status code called back by the handler, or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // Use the payload called back by the handler, or use an empty object
            payload = typeof(payload) == 'object' ? payload : {};

            // Convert the payload to a string to send back to the user
            var payloadString = JSON.stringify(payload);

            // Send the response
            response.setHeader('Content-Type', 'application/json');
            response.writeHead(statusCode);
            response.end(payloadString);

            // Log the request path
            console.log('Returning this response: ', statusCode, payloadString);
        });
    });
};

// Define a request router
server.router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks
};

//Server Initialization
server.init = function(){
    // Start the http server, and have it listen on port 3000
    server.httpServer.listen(config.httpPort, function(){
        console.log("We are instantiating the http server "+config.httpPort);
    });

    // We want to start the https server
    server.httpsServer.listen(config.httpsPort, function(){
        console.log("We are instantiating the https server "+config.httpsPort);
    });
};

//Export the server
module.exports = server;