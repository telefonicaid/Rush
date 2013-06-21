http = require('http');
https = require('https');

var makeRequest = function(options, content, cb) {
  'use strict';

  var req = http.request(options, function(res) {

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

exports.makeRequest = makeRequest;
exports.makeRequestHttps = makeRequestHttps;
