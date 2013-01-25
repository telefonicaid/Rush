var http = require('http');

var createServer = function (timeout, resSize, launchedCB, connectionCB) {
  'use strict';

  var server = http.createServer(function (req, res) {

    req.on('end', function (data) {

      setTimeout(function () {
        res.write(genResponseData(resSize), 'utf8');
        res.end();
        //req.connection.destroy();

        if (connectionCB && typeof(connectionCB) === 'function') {
          connectionCB();
        }

      }, timeout);
    });

  }).listen(5001, 'localhost', launchedCB);

  server.isClosed = false;

  return server;
};

var closeServer = function (server, cb) {
  'use strict';

  if (!server.isClosed) {

    if (cb && typeof(cb) === 'function') {
      server.on('close', cb);
    }

    server.close();
  }
};


var genResponseData = function (size) {
  'use strict';

  var string_length = size;
  var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var randomstring = '';

  for (var i = 0; i < string_length; i++) {
    var num = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(num, num + 1);
  }

  return randomstring;
};

exports.createServer = createServer;
exports.closeServer = closeServer;