http = require('http');
https = require('https');
config = require('./config');

var makeRequest = function(options, content, cb) {
  'use strict';

  var req = http.request(options, function(res) {

    var data = ''; //returned object from request
    res.setEncoding('utf8');

    res.on('data', function(chunk) {
      data += chunk;
    });

    res.on('end', function() {
      cb(null, data, res);
    });
  });

  req.on('error', function(e) {
    cb(e, null);
  });

  if (options.method === 'POST' || options.method === 'PUT') {
    req.write(content);
  }

  req.end();

};

var makeRequestHttps = function(options, content, cb) {
  'use strict';
  options.agent = new https.Agent(options);

  var req = https.request(options, function(res) {

     // console.log("statusCode: ", res.statusCode);
     // console.log("headers: ", res.headers);
    var data = ''; //returned object from request
    res.setEncoding('utf8');

    res.on('data', function(chunk) {
      data += chunk;
    });

    res.on('end', function() {
      cb(null, data);
    });
  });

  req.on('error', function(e) {
      cb(e, null);
  });

  if (options.method === 'POST' || options.method === 'PUT') {
    req.write(content);
  }

  req.end();
};

var serverListener = function(port, responseParameters, connectedCallback, dataCallback) {

  var srv = http.createServer(function(req, res) {

    var content = "";
    var request = {};

      request.headers = req.headers;
      request.method = req.method;
      request.url = req.url;

    var response = {};

      response.body = responseParameters.body || null;
      response.statusCode = responseParameters.statusCode || 200;
      response.headers = responseParameters.headers || {};

    req.on('data', function(chunk) {
      content += chunk;
    });

    srv.on('error', function() {
      dataCallback(null);
    });

    req.on('end', function() {
      res.writeHead(response.statusCode, response.headers);
      res.end(response.body);

      request.body = content;
      dataCallback(request);
    });

  }).listen(port, connectedCallback);

  return srv;

};

exports.makeRequest = makeRequest;
exports.makeRequestHttps = makeRequestHttps;
