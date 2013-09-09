var https = require('https');
var http = require('http');
var path = require('path');

var fs = require('fs');
var config = require('./config.js');

var options = {
	key: fs.readFileSync(path.resolve(__dirname, './serverCert.key')),
	cert: fs.readFileSync(path.resolve(__dirname, './serverCert.crt')),
	//rejectUnauthorized: false
};

// Verbose MODE
var vm = false;

var serverListener = function(portProtocol, responseParameters, connectedCallback, dataCallback) {

  var protocol = portProtocol.protocol || 'http';
  var srv;

  if(protocol.toLowerCase() === 'http'){
    srv = http.createServer(requestHandler);
  } else {
    srv = https.createServer(options, requestHandler);
  }

  srv.listen(portProtocol.port, connectedCallback);


  function requestHandler(req, res){

    var content = "";
    var request = {};

      request.headers = req.headers;
      request.method = req.method;
      request.url = req.url;

    var response = {};

      response.body = responseParameters.body || "Request Accepted";
      response.statusCode = responseParameters.statusCode || 200;
      response.headers = responseParameters.headers || {};

	  if(vm){console.log(response);}

    req.on('data', function(chunk) {
      content += chunk;
    });

    req.on('end', function() {
      res.writeHead(response.statusCode, response.headers);
      res.end(response.body);
      request.body = content;
      if(dataCallback){
        dataCallback(request);
      }
    });
  }

  srv.on('error', function(err) {
    if(dataCallback){
      dataCallback(null);
    }
  });

  return srv;

};

module.exports = serverListener;
