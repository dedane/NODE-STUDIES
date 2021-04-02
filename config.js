/*
*
*CREATE AND EXPORT CONFIGURATIONS
*
*/


//CONTAINER FOR ALL ENVIRONMENTS
var environments = {}

//STAGING OBJECT
environments.staging = {
    'httpport': 3000,
    'httpsport': 3001,
    'envName': 'staging'
};

environments.production ={
    'httpport': 5000,
    'httpsport': 5001,
    'envName': 'production'
}

//DETERMIN WHICH ENVIRONMENT SHOULD BE PASSED AS A COMMAND-LINE ARUMENT
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : ''

//cCHECK THAT THE CURRENT ENVIRONMENT IS ONE OF THE FOLLOWING ABOVE IF NOT REVERT TO STAGING

var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging

//EXPORT THE MODULE
module.exports = environmentToExport;