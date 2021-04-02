/*
*
*Primary file for api
*
*/

//Dependencies
const http = require('http');
var https = require('https')
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');
var _data = require('./lib/data');


//TESTING
// @TODO delete this
_data.delete('test','newFile',{'fizz': 'buzz'}, function(err){
    console.log('this was the error',err )
})

//INSTATIATES THE  HTTP SERVER
let httpserver = http.createServer((req,res) => {

    //GET THE URL AND THEN PARSE IT
   unifiedServer(req,res);

         //SEND THE RESPONSE
    //res.end('Hello world')

    //LOG THE REQUEST PATH
    //console.log("This header:" , headers)
    

    //SEND THE RESPONSE
    //res.end('Hello world')

    //LOG THE REQUEST PATH
    //console.log("Request was received with this payload:" , buffer)

    
});
//Start the http server on the config port
httpserver.listen(config.httpport, () => {
    console.log("Server is listening on port" + config.httpport + " in config " + config.envName );
})

httpServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert':fs.readFileSync('./https/cert.pem'),
}

//INSTATIATE THE HTTPS SERVER
let httpsserver = https.createServer(httpServerOptions,(req,res) => {

   unifiedServer(req,res);

    
});

//Start the https server on the config port
httpsserver.listen(config.httpsport, () => {
    console.log("Server is listening on port" + config.httpsport + " in config " + config.envName );
})
//ALL THE SERVER LOGIC FOR BOTH HTTP AND HTTPS SERVER
var unifiedServer = function(req,res){
    let parsedUrl = url.parse(req.url, true)

    //GET THE PATH
    let path = parsedUrl.pathname;
    let trimmedPath = path.replace(/^\/+|\/+$/g,'');


    ///GET THE QUERY STRING AS AN OBJECT
    var queryStringObject = parsedUrl.query;

    //GET THE HTTP METHOD
    let method = req.method.toLowerCase();

    //GET THE HEADERS AS AN OBJECT
    let headers = req.headers;

    //GET THE PAYLOAD, IF THERE iS ANY
    let decoder = new StringDecoder('utf-8');
    var buffer = '';
    req.on('data', (data ) => {
        buffer += decoder.write(data);
    })
    req.on('end', () => {
        buffer += decoder.end();

    })
    //CHOOSE THE HANDLER THE REQUEST SHOULD GO TO OTHERWISE GO TO 404

    let chooseHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

    //CONSTRUCT DATA OBJECT TO SEND TO THE HANDLER
    var data = {
        'trimmedPath': trimmedPath,
        'queryStringObject': queryStringObject,
        'method': method,
        'headers': headers,
        'payload': buffer

    }

    //ROUTE THE REQUEST TO THE HANDLER SPECIFIED IN THE ROUTE
    chooseHandler(data, (statusCode,payload) => {
        //USE THE STATUS CODE CALLBACK BY THE HANDLER, OR DEFAULT BACK
        statusCode = typeof(statusCode) == 'number' ? statusCode: 200

        //use the payload called bac by the handler or default  to handler
        payload = typeof(payload) == 'object' ? payload : {};

        //convert payload to string
        var payloadString = JSON.stringify(payload)
        
        //return the statuscode response
        res.setHeader('Content-Type', 'application/json')
        res.writeHead(statusCode);
        
        res.end(payloadString)

        //THE RESPONSE
        console.log("We are returning this response",statusCode, payloadString);
    })
}
//DEFINE OUR HANDLERS
var handlers = {};

//SAMPLE HANDLER
// handlers.sample = function(data,callback){
//     //callback a http status code, and a payload which should be an object
//     callback(406, {'name': 'sample handler'})
// }

handlers.ping = function(data,callback){
    callback(200);
}

//NOT FOUND HANDLER
handlers.notFound = function(data,callback){
    callback(404);
}
//DEFINING A REQUEST ROUTER
var router = {
    'ping': handlers.ping
}