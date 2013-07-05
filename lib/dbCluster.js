/*
 Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U

 This file is part of PopBox.

 PopBox is free software: you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free
 Software Foundation, either version 3 of the License, or (at your option) any
 later version.
 PopBox is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or
 FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public
 License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with PopBox. If not, seehttp://www.gnu.org/licenses/.

 For those usages not covered by the GNU Affero General Public License
 please contact with::dtc_support@tid.es
 */

//clustering and database management (object)

var redisModule = require('redis');
var config = require('./configBase.js');
var poolMod = require('./pool.js');
var Sentinel = require('./sentinel.js');
var util = require('util');
var events = require('events');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();

var tempDown = false;

var Connection = function(port, host, isOwn){

  var self = this;

  self.host = host;
  self.port = port;
  cli = redisModule.createClient(port, host, {max_attempts : 5});
  require('./hookLogger.js').initRedisHook(cli, logger);

  logger.info('Connected to REDIS ', host + ':' + port);

  cli.select(config.selectedDB);
  cli.isOwn = isOwn || false;

  cli.on('error', function(err){
    console.log(err);
  });

  self.db = cli;
};

Connection.prototype.connected = function() {
  return this.db.connected;
};

var Monitor = function(database){
  events.EventEmitter.call(this);
  this.database = database;
};

util.inherits(Monitor, events.EventEmitter);

Monitor.prototype.start = function(){

  var self = this;

  self.monitor = setInterval(function(){
    if(!self.database.connected()){
      console.log("disconnected");
      self.emit('disconnected');
    } else {
      console.log("connected");
      self.emit('connected');
    }
  }, 3000);
};

Monitor.prototype.stop = function(){
  var self = this;

  clearInterval(self.monitor);
};

Monitor.prototype.restart = function(database){
  var self = this;

  this.stop();
  this.database = database;
  this.start();
};

logger.prefix = path.basename(module.filename, '.js');

var dbMaster = new Connection(config.queue.redisPort, config.queue.redisHost);
var blockingDb = new Connection(config.queue.redisPort, config.queue.redisHost);

var sentinels = [];

var monitor = new Monitor(dbMaster);
    monitor.start();
    monitor.on('connected', isConnected);
    monitor.on('disconnected', notConnected);

for(var i = 0; i < config.sentinels.length; i++){
  var host = config.sentinels[i].host;
  var port = config.sentinels[i].port;

  var sent = new Sentinel(port, host);
  sentinels.push(sent);
}

//masterSentinel.getSentinels();

var connectionChanged = new events.EventEmitter();;

function isConnected(){
  if(tempDown){
    connectionChanged.emit('up');
  }
  tempDown = false;
}
function notConnected(){
  if(!tempDown){
    connectionChanged.emit('down');
  }
  tempDown = true;
}


var handlerChanged = function(newMaster){
  var host = newMaster.host, port = newMaster.port;
  dbMaster = new Connection(port, host);
  blockingDb = new Connection(port, host);

  monitor.restart(dbMaster);
};

var checkSentinels = function(){
  var sentsUp = 0;
  for(var i = 0; i < sentinels.length; i++){
    if(sentinels[i].up){
      sentsUp++;
    }
  }
  if(config.minQuorum > sentsUp){
    logger.warning("Imposible to reach an agreement between Sentinels");
  }
};

var sentinelHandler = function(){
  checkSentinels();

  for(var i = 0; i < sentinels.length; i++){
    if(sentinels[i].up){
      var currentSentinel = sentinels[i];
      currentSentinel.on('changed', handlerChanged);
      currentSentinel.on('wentDown', function onError(){
        currentSentinel.removeListener('wentDown', onError);
        currentSentinel.removeListener('changed', handlerChanged);
        sentinelHandler();
      });
      return currentSentinel;
    }
  }
};

for(var i=0; i<sentinels.length; i++){
  sentinels[i].once('sentinelReady', function(){
    process.removeAllListeners('sentinelReady');
    sentinelHandler();
  });
}



var checkAvailable = function(req, res, next){
  'use strict';
  if (tempDown) {
    var longFail;
    var onConnected = function(){
      clearTimeout(longFail);
      next();
    };
    longFail = setTimeout(function(){
      monitor.removeListener('connected', onConnected);
      res.send(500,{error : 'Some redis servers are failing'});
    }, 15000);
    monitor.once('connected', onConnected);
  } else {
    next();
  }
};

var getDb = function() {
  'use strict';
  return dbMaster.db;
};

var getBlockingDb = function() {
  'use strict';
  return blockingDb.db;
};

/**
 *
 * @param {string} queu_id identifier.
 * @return {RedisClient} rc redis client for QUEUES.
 */
exports.getDb = getDb;

exports.getBlockingDb = getBlockingDb;

exports.connectionChanged = connectionChanged;


exports.checkAvailable = checkAvailable;


require('./hookLogger.js').init(exports, logger);
