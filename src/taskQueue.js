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

var redis = require('redis');
var configGlobal = require('./configBase');
var config = configGlobal.queue;
var dbCluster = require('./dbCluster.js');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

//redis.debug_mode = true;

function put(key, obj, errFun) {
    'use strict';
    var simpleReqStr = JSON.stringify(obj);
    var db = dbCluster.getDb(obj.id);
    db.lpush(key, simpleReqStr, errFun);
}

function get(keys, auxQueueId, callback) {
    'use strict';
    var ownDb = dbCluster.getOwnDb(auxQueueId);
    var db = dbCluster.getDb(auxQueueId);
    ownDb.brpop(keys.control, keys.hpri, keys.lpri, 0, function onPop(err, data) {
            //technical DEBT dou to REDIS unsupported functionality
            //BRPOPLPUSH from multiple sources OR LUA Scripting
            db.lpush(auxQueueId, data[1], function onPush(err) {
                var obj = JSON.parse(data[1]);
                callback(err, { queueId: data[0], task: obj });
            });
    });
}

function getPending(idconsumer, callback) {
    'use strict';
    var db = dbCluster.getDb(idconsumer);
    db.rpop(idconsumer, function onPendingData(err, data) {
        var obj = JSON.parse(data);
        if (callback) {callback(err, { queueId: 'PendingRecovery', task: obj });}
    });
}

function remProcessingQueue(idconsumer, callback) {
    'use strict';
    var db = dbCluster.getDb(idconsumer);
    db.del(idconsumer, callback);
}

exports.put = put;
exports.get = get;
exports.remProcessingQueue = remProcessingQueue;
exports.getPending = getPending;

require('./hookLogger.js').init(exports, logger);
