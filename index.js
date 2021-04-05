/*
*Primary file for the Api
*
*/

//Dependencies
var server = require('./lib/server');
var workers = require('./lib/workers');

var app = {};

app.init = function(){
  //Start the server
  server.init();

  //start the workers
   workers.init();

}

app.init();

module.exports = app;