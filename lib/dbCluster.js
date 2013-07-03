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
var notAvailables = [];

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

var Monitor = function(connections){
  events.EventEmitter.call(this);
  this.connections = connections;
};

util.inherits(Monitor, events.EventEmitter);

Monitor.prototype.start = function(){

  var self = this;

  self.monitor = setInterval(function(){
    var failing = [];
    for(var i in self.connections){
      if(!self.connections[i].con.connected()){
        failing.push({host : self.connections[i].host, port : self.connections[i].port});
      }
    }
    if(failing.length === 0){
      console.log("connected");
      self.emit('connected');
    } else {
      console.log("disconnected");
      self.emit('disconnected', failing);
    }

  }, 3000);
};

Monitor.prototype.stop = function(){
  var self = this;

  clearInterval(self.monitor);
};

Monitor.prototype.restart = function(connections){
  var self = this;

  this.stop();
  this.connections = connections;
  this.start();
};

logger.prefix = path.basename(module.filename, '.js');

var dbObject = {};
var mastersArray = [];
var sentinels = [];

var masterSentinel = new Sentinel(config.masterSentinel.port, config.masterSentinel.host);
sentinels.push(masterSentinel);

for(var i = 0; i < config.otherSentinels.length; i++){
  var host = config.otherSentinels[i].host;
  var port = config.otherSentinels[i].port;

  var sent = new Sentinel(port, host);
  sentinels.push(sent);
}

//masterSentinel.getSentinels();

function isConnected(){
  notAvailable = [];
  tempDown = false;
}
function notConnected(failing){
  tempDown = true;
  notAvailables = failing;
}

var handlerChanged = function(newMaster){
  var host = newMaster.host, port = newMaster.port, master = newMaster.master;
  dbObject[master].con = new Connection(port, host);
  var newPool = poolMod.Pool(dbObject[master].con);
  dbObject[master].pool = newPool;

  console.log(dbObject);

  monitor.restart(dbObject);
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

var sentinelHandler = function(sentinel){
  checkSentinels();
  var currentSentinel;

  if(!sentinel){
    for(var i = 0; i < sentinels.length; i++){
      console.log(sentinels[i].up);
      if(sentinels[i].up){
        currentSentinel = sentinels[i];
        break;
      }
    }
  }
  else {
    currentSentinel = sentinel;
  }
  if(currentSentinel){
    currentSentinel.on('changed', handlerChanged);
    currentSentinel.on('wentDown', function onError(){
      currentSentinel.removeListener('wentDown', onError);
      currentSentinel.removeListener('changed', handlerChanged);
      sentinelHandler();
    });
  }
  return currentSentinel;
};

var connectionReady = new events.EventEmitter();
var mastersReady = false;

masterSentinel.once('sentinelReady', function(){
  process.removeAllListeners('sentinelReady');
  var currentSentinel = sentinelHandler(masterSentinel);
  currentSentinel.getMasters(function(err, masters){
    dbObject = masters;
    console.log(masters);
    for (var master in masters) {
      var port = masters[master].port || redisModule.DEFAULT_PORT;
      var host = masters[master].ip;
      var connection = new Connection(port, host);
      var pool = poolMod.Pool(connection);
      dbObject[master].pool = pool;
      dbObject[master].con = connection;

      mastersArray.push(master);
    }
    mastersArray.sort();


    var monitor = new Monitor(dbObject);
    monitor.start();
    monitor.on('connected', isConnected);
    monitor.on('disconnected', notConnected);

    mastersReady = true;
    connectionReady.emit('mastersReady');
  });
});

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
      res.send(500,{error : 'Some redis servers are failing', redisFailing : notAvailables});
    }, 15000);
    monitor.once('connected', onConnected);
  } else {
    next();
  }
};

var getDb = function(id) {
  'use strict';
  console.log(mastersArray);
  var hash = hashMe(id, mastersArray.length);
  return dbObject[mastersArray[hash]].con.db;
};

var getOwnDb = function(id, callback) {
  'use strict';
  var hash = hashMe(id, mastersArray.length);
  //get the pool
  var pool = dbObject[mastersArray[hash]].pool;
  return pool.get(id);
};

var hashMe = function(id, mod) {
  'use strict';
  var i,
      len,
      sum = 0;

  if (typeof id !== 'string') {
    throw new TypeError('id must be a string');
  }
  len = id.length;
  for (i = 0; i < len; i++) {
    sum += id.charCodeAt(i);
  }
  return sum % mod;
};

var free = function (db) {
  'use strict';
  //return to the pool TechDebt
  if (db.isOwn) {
    db.pool.free(db);
  }
};

/**
 *
 * @param {string} queu_id identifier.
 * @return {RedisClient} rc redis client for QUEUES.
 */
exports.getDb = getDb;

/**
 *
 * @param {string} queuw_id identifier.
 * @return {RedisClient} rc redis client for QUEUES.
 */
exports.getOwnDb = getOwnDb;

/**
 *
 * @param {RedisClient} db Redis DB to be closed.
 */
exports.free = free;



exports.checkAvailable = checkAvailable;

exports.mastersReady = mastersReady;

exports.connectionReady = connectionReady;

require('./hookLogger.js').init(exports, logger);
