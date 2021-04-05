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
    'maxChecks': 5,
    'twilio' : {
        'accountSid': 'ACf827d2f19190200c9789c30b1a42af37',
        'authToken': 'bb20c8eddd1c5abab0038b76f69833ba',
        'fromPhone': '(617) 581-0640'
    }
};

environments.production ={
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'production',
    'hashingSecret': 'thisisASecret',
    'maxChecks': 5,
    'twilio' : {
        'accountSid': '',
        'authToken': '',
        'fromPhone': ''
    }
}

//DETERMIN WHICH ENVIRONMENT SHOULD BE PASSED AS A COMMAND-LINE ARUMENT
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : ''

//cCHECK THAT THE CURRENT ENVIRONMENT IS ONE OF THE FOLLOWING ABOVE IF NOT REVERT TO STAGING

var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging

//EXPORT THE MODULE
module.exports = environmentToExport;