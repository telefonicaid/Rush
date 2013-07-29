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
var apiErrorsParser = require('./unicaErrorsParser.js');
var Sentinel = require('./sentinel.js');
var util = require('util');
var events = require('events');

var G = require('./myGlobals.js').C;

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

var tempDown = false;

var Connection = function(port, host, isOwn){

  var self = this;

  self.host = host;
  self.port = port;
  cli = redisModule.createClient(port, host);
  //require('./hookLogger.js').initRedisHook(cli, logger);

  logger.info({ opType: 'CREATE REDIS CONNECTION',  msg: 'Connected to REDIS '}, host + ':' + port);

  cli.select(config.selectedDB);
  cli.isOwn = isOwn || false;

  cli.on('error', function(err){
    logger.error({ opType: 'REDIS CONNECTION' }, err);
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
      logger.info({ opType: 'MONITOR', msg: 'disconnected' });
      self.emit('disconnected');
    } else {
      logger.info({ opType: 'MONITOR', msg: 'connected' });
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

var dbMaster;
var blockingDb;
var sentinels = [];
var monitor;

var numSentinels = 0;

//masterSentinel.getSentinels();

var connectionChanged = new events.EventEmitter();
var longFailing;

function isConnected(){
  if(tempDown){
    connectionChanged.emit('up');
    clearTimeout(longFailing);
  }
  tempDown = false;
}

function notConnected(){
  if(!tempDown){
    connectionChanged.emit('down');
    longFailing = setTimeout(function(){
      logger.error({ opType: 'ENDING', msg: 'No Redis are available' });
      throw new Error('No Redis are available, shutting down...');
    }, config.longFailingTimeout);
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
    logger.info({ opType: 'CHECK SENTINELS',  msg: 'Impossible to reach an agreement between Sentinels'});
  } else {
  	logger.info({ opType: 'CHECK SENTINELS',  msg: 'It is possible to reach an agreement between Sentinels'});
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

var init = function(done){

  var didInit = false;

  if(config.sentinels.length === 0){
    dbMaster = new Connection(config.queue.redisPort, config.queue.redisHost);
    blockingDb = new Connection(config.queue.redisPort, config.queue.redisHost);

    dbMaster.db.on('error', function(err){
      //TODO posible tirar el sevicio si falla la db
    });

    monitor = new Monitor(dbMaster);
    monitor.start();
    monitor.on('connected', isConnected);
    monitor.on('disconnected', notConnected);

    done();
  } else {
    for(var i = 0; i < config.sentinels.length; i++){
      var host = config.sentinels[i].host;
      var port = config.sentinels[i].port;

      var sent = new Sentinel(port, host);
      sentinels.push(sent);
    }

    for(var i=0; i<sentinels.length; i++){
      sentinels[i].once('sentinelReady', function(){
        process.removeAllListeners('sentinelReady');
        if(!didInit){

          didInit = true;

          var selectedSentinel = sentinelHandler();
          selectedSentinel.getMaster(function(err, master){
            if(!err && master){
              dbMaster = new Connection(master.port, master.host);
              blockingDb = new Connection(master.port, master.host);

              monitor = new Monitor(dbMaster);
              monitor.start();
              monitor.on('connected', isConnected);
              monitor.on('disconnected', notConnected);
            }
            done(err);
          });
        }
      });
      sentinels[i].on('sentinelReady', checkSentinels);
      sentinels[i].once('wentDown', checkSentinels);
    }
  }
};

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
      var error = { type: G.SERVER_ERROR, message: 'Some redis servers are failing' };
      var response = apiErrorsParser.parseError(error);
      res.send(response.statusCode, response.data);
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

exports.init = init;
exports.getDb = getDb;
exports.getBlockingDb = getBlockingDb;
exports.connectionChanged = connectionChanged;
exports.checkAvailable = checkAvailable;


//require('./hookLogger.js').init(exports, logger);
