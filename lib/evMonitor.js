var MG = require("./myGlobals").C;
var redis = require('redis');
var config = require('./configBase.js');

var rc = redis.createClient(config.redisPort, config.redisHost);

function init(emitter) {
  "use strict";
  return function(callback) {
    emitter.on(MG.EVENT_NEWSTATE, function onNewEvent(data) {
      rc.publish('STATE:' + data.state, JSON.stringify(data));
    });
    callback(null, 'evMonitor OK');
  };
}

exports.init = init;
