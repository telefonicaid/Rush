http = require('http');

var makeRequest = function(options, content, cb) {
  'use strict';
  var data = '';

  var req = http.request(options, function(res) {

    var o; //returned object from request
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
