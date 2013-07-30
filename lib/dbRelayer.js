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

var configGlobal = require('./configBase');
var config = configGlobal.dbrelayer;
var dbCluster = require('./dbCluster.js');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');


function update(key, obj, traceID, userID, callback) {
  'use strict';

  if (typeof traceID === 'function') {
    callback = traceID;
    traceID = null;
  }

  var str; // aux var for stringify object properties
  var o_aux = {}; // auxiliar object to adapt to redis
  var p;
  // redis client allows one depth level of nested objects, i.e. a plain object
  for (p in obj) {
    if (obj.hasOwnProperty(p) && typeof obj[p] === 'object') {
      str = JSON.stringify(obj[p]);
      o_aux[p] = str;
    } else {
      o_aux[p] = obj[p];
    }
  }

  var db = dbCluster.getDb(key);

  logger.debug('Update Task', { component: logger.prefix + ' [redis]',userID: userID, op: 'HMSET',
    unica_correlator: traceID, transaction_id: key, arguments: [ config.keyPrefix + key, o_aux ] });

  db.hmset(config.keyPrefix + key, o_aux, function onHmset(err, res) {

    logger.debug('Set Expire Time', { component: logger.prefix + ' [redis]', userID: userID, op: 'EXPIRE',
      unica_correlator: traceID, transaction_id: key, arguments: [ config.keyPrefix + key,  configGlobal.expireTime ]});

    db.expire(config.keyPrefix + key, configGlobal.expireTime, function(err) {
      if (err) {
        logger.error('Redis Error (expire)', { op: 'UPDATE KEY', unica_correlator: traceID,
          userID: userID, transaction_id: key, error: err});
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

  logger.debug('Get task data', { component: logger.prefix + ' [redis]', op: 'HGETALL', unica_correlator: traceID,
    userID: userID, transaction_id: key, arguments: [ config.keyPrefix + key ] });

  db.hgetall(config.keyPrefix + key, function onHgetall(err, data) {
    if (err) {
      logger.warning('Redis Error (hgetall)', { op: 'GET TASK DATA', unica_correlator: traceID,
        userID: userID, transaction_id: key, error: err });
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
