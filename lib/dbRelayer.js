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

var redis = require('redis');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');


var rcli = redis.createClient(config.redisPort, config.redisHost);
//require('./hookLogger.js').initRedisHook(rcli, logger);

function update(key, obj, cllbk) {
  'use strict';

  logger.debug({ opType: 'UPDATE KEY', traceID: key, msg: 'Arguments: '}, [ obj ]);

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

  logger.debug({ component: logger.prefix + ' [redis]', opType: 'HMSET', traceID: key, msg: 'Arguments: '},
      [ config.keyPrefix + key, o_aux ]);

  rcli.hmset(config.keyPrefix + key, o_aux, function onHmset(err, res) {

    logger.debug({ component: logger.prefix + ' [redis]', opType: 'EXPIRE', traceID: key, msg: 'Arguments: '},
        [ config.keyPrefix + key,  configGlobal.expireTime ]);

    rcli.expire(config.keyPrefix + key, configGlobal.expireTime, function(err) {
      if (err) {
        logger.error({ opType: 'UPDATE KEY', traceID: key,  msg: 'Redis Error (expire)'}, [config.keyPrefix +
            key, configGlobal.expireTime]);
      }

    });
    if (cllbk) {
      cllbk(err, res);
    }
  });
}

function getData(key, callback) {
  'use strict';

  logger.debug({ opType: 'GET TASK DATA', traceID: key, msg: 'Arguments: '}, [key]);
  logger.debug({ component: logger.prefix + ' [redis]', opType: 'HGETALL', traceID: key, msg: 'Arguments: '},
      [ config.keyPrefix + key ]);

  rcli.hgetall(config.keyPrefix + key, function onHgetall(err, data) {
    if (err) {
      logger.warning({ opType: 'GET TASK DATA', traceID: key, msg: 'Redis Error (hgetall)' }, err);
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
