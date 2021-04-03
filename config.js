/*
*
*CREATE AND EXPORT CONFIGURATIONS
*
*/


//CONTAINER FOR ALL ENVIRONMENTS
var environments = {}

//STAGING OBJECT
environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'staging',
    'hashingSecret': 'thisisASecret',
    'maxChecks': 5
};

environments.production ={
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'production',
    'hashingSecret': 'thisisASecret',
    'maxChecks': 5
}

//DETERMIN WHICH ENVIRONMENT SHOULD BE PASSED AS A COMMAND-LINE ARUMENT
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : ''

//cCHECK THAT THE CURRENT ENVIRONMENT IS ONE OF THE FOLLOWING ABOVE IF NOT REVERT TO STAGING

var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging

//EXPORT THE MODULE
module.exports = environmentToExport;