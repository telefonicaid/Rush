//Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U
//
//This file is part of RUSH.
//
//  RUSH is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public
//  License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later
//  version.
//  RUSH is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty
//  of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
//
//  You should have received a copy of the GNU Affero General Public License along with RUSH
//  . If not, seehttp://www.gnu.org/licenses/.
//
//For those usages not covered by the GNU Affero General Public License please contact with::dtc_support@tid.es

var configGlobal = require('./config.js');
var config = configGlobal.dbrelayer;
var dbCluster = require('./dbCluster.js');

var path = require('path');
var log = require('./logger/logger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');


function update(key, obj, traceID, userID, callback) {
  'use strict';

  if (typeof traceID === 'function') {
    callback = traceID;
    traceID = null;
  }

  var str; // aux var for stringify object properties
  var aux = {}; // auxiliar object to adapt to redis
  var p;
  // redis client allows one depth level of nested objects, i.e. a plain object
  for (p in obj) {
    if (obj.hasOwnProperty(p) && typeof obj[p] === 'object') {
      str = JSON.stringify(obj[p]);
      aux[p] = str;
    } else {
      aux[p] = obj[p];
    }
  }

  var db = dbCluster.getDb(key);

  logger.debug('Update Task', { component: logger.prefix + ' [redis]',userID: userID, op: 'HMSET',
    correlator: traceID, transid: key, arguments: [ config.keyPrefix + key, aux ] });

  db.hmset(config.keyPrefix + key, aux, function onHmset(err, res) {

    logger.debug('Set Expire Time', { component: logger.prefix + ' [redis]', userID: userID, op: 'EXPIRE',
      correlator: traceID, transid: key, arguments: [ config.keyPrefix + key,  configGlobal.expireTime ]});

    db.expire(config.keyPrefix + key, configGlobal.expireTime, function(err) {
      if (err) {
        logger.error('Redis Error (expire)', { op: 'UPDATE KEY', correlator: traceID,
          userID: userID, transid: key, error: err});
      }

    });
    if (callback) {
      callback(err, res);
    }
  });
}

function getData(key, traceID, userID, callback) {
  'use strict';

  if (typeof traceID === 'function') {
    callback = traceID;
    traceID = null;
  }

  var db = dbCluster.getDb(key);

  logger.debug('Get task data', { component: logger.prefix + ' [redis]', op: 'HGETALL', correlator: traceID,
    userID: userID, transid: key, arguments: [ config.keyPrefix + key ] });

  db.hgetall(config.keyPrefix + key, function onHgetall(err, data) {
    if (err) {
      logger.warning('Redis Error (hgetall)', { op: 'GET TASK DATA', correlator: traceID,
        userID: userID, transid: key, error: err });
      callback(err);
    }
    else {
      callback(null, data);
    }
  });
}
exports.update = update;
exports.getData = getData;

//require('./hookLogger.js').init(exports, logger);
