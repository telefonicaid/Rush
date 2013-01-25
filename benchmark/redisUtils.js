var redisModule = require('redis');
var config = require('./config.js');
var dbTr = redisModule.createClient(config.redisServer.port, config.redisServer.host);

var monitorQueue = function (queue, callback) {
  'use strict';

  dbTr.llen(queue, function (err, value) {
    //Execute client callback
    callback(value);
  });
};

var flushBBDD = function (callback) {
  'use strict';

  dbTr.flushall(callback);

};

var closeConnection = function () {
  'use strict';

  dbTr.end();
};

exports.monitorQueue = monitorQueue;
exports.flushBBDD = flushBBDD;
exports.closeConnection = closeConnection;

