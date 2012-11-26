var redisModule = require('redis');
var config = require('./config.js');


var monitorQueue = function (queue, callback) {
    'use strict';

    var dbTr = redisModule.createClient(config.redisServer.port, config.redisServer.host);

    dbTr.llen(queue, function (err, value) {
        //Execute client callback
        callback(value);

        //The connection can be closed only when the petitions has been completed
        dbTr.end();
    });
};

exports.monitorQueue = monitorQueue;
