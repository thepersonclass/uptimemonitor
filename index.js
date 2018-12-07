// Dependancies

const server = require('./lib/server');
const workers = require('./lib/workers');

//Declare the app
let app = {};

//Initialization
app.init = function(){
    //Start the server
    server.init();

    //Start the workers
    //workers.init();
}

//Execute the app
app.init();

//Export module
module.exports = app;
