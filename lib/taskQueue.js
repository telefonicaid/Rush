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

'use strict';

var redis = require('redis');
var util = require('util');
var configGlobal = require('./config.js');
var dbCluster = require('./dbCluster.js');
var MG = require('./myGlobals').C;
var config = configGlobal.queue;

var path = require('path');
var log = require('./logger/logger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

var blockingDb;

var cleverPush="\
local arguments=ARGV\n\
local max_mem=tonumber(table.remove(arguments))\n\
local queue=KEYS[1]\n\
local s=redis.call('info','memory')\n\
local mem=tonumber(string.match(s,'used_memory:(.-)\\r\\n'))\n\
if mem<(max_mem) then\n\
   return redis.call('lpush', queue, unpack(arguments))\n\
else\n\
   return {err='Max queue size reached: infomem: '..tostring(mem)..'  max_mem: '..tostring(max_mem)}\n\
end\n\
";

function put(key, objs, callback) {
  'use strict';

  //Legacy (convert obj into an array)
  if (!util.isArray(objs)) {
    logger.debug('Insert Task', { op: 'PUT', userID: objs.user, correlator: objs.traceID, transid: objs.id,
      arguments: [ key, objs ], force: objs.forceLog });
    objs = [objs];
  } else {
    logger.debug('Insert Tasks', { op: 'PUT', tasks: objs, queue: key });
  }

  //Parse objects
  var parsedObjs = objs.map(function(obj) {
    return JSON.stringify(obj)
  });

  var db = dbCluster.getDb();
  //arguments: cleverPush, 1, key, obj[0], ..., obj[n], configGlobal.redisMaxMemory, callback
  var evalArgs = [cleverPush, 1, key].concat(parsedObjs).concat([configGlobal.redisMaxMemory, callback]);
  db.eval.apply(db, evalArgs);
}

function get(keys, auxQueueId, callback) {
  'use strict';

  logger.debug('Get Tasks', { op: 'GET', arguments: [keys, auxQueueId] });

  if (!blockingDb) {
    throw new Error('Component has not been started');
  }

  //technical DEBT dou to REDIS unsupported functionality
  //BRPOPLPUSH from multiple sources OR LUA Scripting

  blockingDb.brpop(keys.control, keys.hpri, keys.lpri, configGlobal.consumer.brpopTimeout, function onPop(err, data) {
    var task, db;
    if (!err) {
      if (data) {     // data <> [ fromQueue, stringifiedTask ]
        try {
          task = JSON.parse(data[1]);
        }
        catch (e) {
          return callback(e, null);
        }
        db = dbCluster.getDb(auxQueueId);
        db.lpush(auxQueueId, data[1], function onPush(err) {
          try {
            callback(err, { queueId: data[0], task: task });
          } catch (e) {
            callback(e, null);
          }
        });
      }
      else {  // timeout expired  for brpop
           return callback(null, null);
      }
    } else {
      callback(err, null);
    }
  });
}

function getPending(idconsumer, callback) {
  'use strict';

  logger.debug('ID Consumer ' + idconsumer, { op: 'GET PENDING' });

  var db = dbCluster.getDb(idconsumer);
  db.lindex(idconsumer, 0, function onPendingData(err, data) {
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
  'use strict';

  var db = dbCluster.getDb(idconsumer);
  db.del(idconsumer, callback);
}

function openConnections(done) {
  'use strict';

  logger.debug('No arguments', { op: 'OPEN CONNECTIONS' });

  blockingDb = dbCluster.getBlockingDb();

  if(done){
    done();
  }
};

function closeConnections(done) {
  'use strict';

  logger.debug('No arguments', { op: 'CLOSE CONNECTIONS' })

  if(blockingDb && blockingDb.connected){
    blockingDb.end();
  }

  if (done) {
    done();
  }
};


//openConnections should be called before calling other method
exports.openConnections = openConnections;
exports.closeConnections = closeConnections;

exports.put = put;
exports.get = get;
exports.remProcessingQueue = remProcessingQueue;
exports.getPending = getPending;

//require('./hookLogger.js').init(exports, logger);
