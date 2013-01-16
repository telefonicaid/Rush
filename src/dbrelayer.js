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

var configGlobal = require('./config_base');
var config = configGlobal.dbrelayer;

var redis = require('redis');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');


var rcli = redis.createClient(redis.DEFAULT_PORT, config.redis_host);

function update(key, obj, cllbk) {
  'use strict';
  logger.debug('update(key, obj, cllbk)', [key, obj, cllbk]);

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

  rcli.hmset(config.key_prefix + key, o_aux, function onHmset(err, res) {
    logger.debug('onHmset(err, res) ', [err, res]);
    rcli.expire(config.key_prefix + key,
        configGlobal.expire_time, function(err) {
          if (err) {
            logger.error('expire(err, res) ', [config.key_prefix + key,
              configGlobal.expire_time]);
          }

        });
    if (cllbk) {
      cllbk(err, res);
    }
  });
}

function getData(key, callback) {
  'use strict';
  logger.debug('getData(key, callback)', [key, callback]);
  rcli.hgetall(config.key_prefix + key, function onHgetall(err, data) {
    logger.debug('onHgetall(err, data)', [err, data]);
    if (err) {
      logger.warning('onHgetall', err);
      callback(err);
    }
    else {
      callback(null, data);
    }
  });
}
exports.update = update;
exports.getData = getData;

