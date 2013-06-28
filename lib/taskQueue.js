//Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U
//
//This file is part of RUSH.
//
//  RUSH is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//  RUSH is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
//
//  You should have received a copy of the GNU Affero General Public License along with RUSH
//  . If not, seehttp://www.gnu.org/licenses/.
//
//For those usages not covered by the GNU Affero General Public License please contact with::dtc_support@tid.es
'use strict';

var redis = require('redis');
var configGlobal = require('./configBase');
var config = configGlobal.queue;

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');


// ?????? Pool grande de conexiones a redis? Tiene sentido???
var rcli, rcliBlocking;

function put(key, obj, errFun) {
  var simpleReqStr = JSON.stringify(obj);
  rcli.lpush(key, simpleReqStr, errFun);
}

function get(keys, auxQueueId, callback) {
  //technical DEBT dou to REDIS unsupported functionality
  //BRPOPLPUSH from multiple sources OR LUA Scripting
  rcliBlocking.brpop(keys.control, keys.hpri, keys.lpri, 0, function onPop(err, data) {
    if (!err) {
      rcli.lpush(auxQueueId, data[1], function onPush(err) {
        try {
          var obj = JSON.parse(data[1]);
          callback(err, { queueId: data[0], task: obj });
        } catch (e) {
          callback(e, null);
        }
      });
    } else {
      callback(err, null);
    }
  });
}

function getPending(idconsumer, callback) {
  rcli.lindex(idconsumer, 0, function onPendingData(err, data) {
    var obj = null;
    if (!err) {
      try {
        obj = JSON.parse(data);
      }
      catch (e) {
        return callback(e, null)
      }
      return callback(null, { queueId: 'PendingRecovery', task: obj });
    } else {
      return callback(err, null)
    }
  });
}

function remProcessingQueue(idconsumer, callback) {
  rcli.del(idconsumer, callback);
}

function openConnections(done) {

  rcli = redis.createClient(config.redisPort, config.redisHost);
  require('./hookLogger.js').initRedisHook(rcli, logger);
  rcliBlocking = redis.createClient(config.redisPort, config.redisHost);
  require('./hookLogger.js').initRedisHook(rcliBlocking, logger);

  //redis.debug_mode = true;

  if (done) {
    done();
  }

};

function closeConnections(done) {

  rcli.end();
  rcliBlocking.end();

  if (done) {
    done();
  }
};

exports.put = put;
exports.get = get;
exports.remProcessingQueue = remProcessingQueue;
exports.getPending = getPending;

exports.openConnections = openConnections;
exports.closeConnections = closeConnections;

require('./hookLogger.js').init(exports, logger);
