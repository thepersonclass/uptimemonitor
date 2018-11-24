/*
* Create and export configuration variables
*
*/

// Container for all environments
var environments = {};

// Staging (default) environment
environments.staging = {
    'httpPort' : 3000,
    'httpsPort' : 3001,
    'envName' : 'staging'
};

// Production environment
environments.production = {
    'httpPort' : 5000,
    'httpsPort' : 5001,
    'envName' : 'production'
};

// Determine which environment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check to see if the environment given is one that exists if so export that environment, or default to staging
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;