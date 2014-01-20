var http = require('http');
var config = require('./config');

var serverListener = function(connectedCallback, dataCallback, port) {
  'use strict';

  var srv = http.createServer(function(req, res) {
    var content = '', headers = req.headers, method = req.method, url = req.url;

    req.on('data', function(chunk) {
      content += chunk;
    });

    srv.on('error', function() {
      dataCallback(null);
    });

    req.on('end', function() {
      setTimeout(function(){
        res.writeHead(200, headers);
        res.end(content);
        dataCallback(method, headers, url, content);
      }, 30);
    });

    //srv.on('close', function () {
    //    console.log('Server closed...');
    //});
  }).listen(port || config.targetServer.port, connectedCallback);

  return srv;

};

exports.serverListener = serverListener;
