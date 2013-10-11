var http = require('http');
var config = require('./config');

var serverListener = function(connectedCallback, dataCallback) {

  function callbackIfExist() {
    if (dataCallback && typeof dataCallback === 'function') {
      dataCallback.apply({}, arguments);
    }
  }
  var srv = http.createServer(function(req, res) {
    var content = '', headers = req.headers, method = req.method;

    req.on('data', function(chunk) {
      content += chunk;
    });

    srv.on('error', function() {
      callbackIfExist(null);
    });

    req.on('end', function() {
      res.writeHead(200, headers);
      res.end(content);

      callbackIfExist(method, headers, content);

    });

  }).listen(config.simpleServerPort, connectedCallback);

  return srv;

};

exports.serverListener = serverListener;
