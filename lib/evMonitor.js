var MG = require("./myGlobals").C;
var redis = require('redis');
var config = require('./config.js');
var dbCluster = require('./dbCluster');


function init(emitter) {
  "use strict";
  return function(callback) {
    emitter.on(MG.EVENT_NEWSTATE, function onNewEvent(data) {
      var rc = dbCluster.getDb();
      rc.publish('STATE:' + data.state, JSON.stringify(data));
    });
    callback(null, 'evMonitor OK');
  };
}

exports.init = init;
