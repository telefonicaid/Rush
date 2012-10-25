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
var config_global = require('./config_base');
var config = config_global.queue;

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename,'.js');


// ?????? Pool grande de conexiones a redis? Tiene sentido???

var rcli = redis.createClient(redis.DEFAULT_PORT, config.redis_host);
var rcliBlocking = redis.createClient(redis.DEFAULT_PORT, config.redis_host);


//redis.debug_mode = true;

function put(key, obj, err_fun) {
    "use strict";
    logger.debug('put(key, obj, err_fun)', [key, obj, err_fun]);

    var simple_req_str = JSON.stringify(obj);

    logger.debug('put - simple_req_str ', simple_req_str);

    rcli.lpush(key, simple_req_str,err_fun);
}

function get(keys, aux_queue_id, callback) {
    "use strict";
    logger.debug('get(keys, aux_queue_id, callback)',[keys, aux_queue_id, callback]);

    rcliBlocking.brpop(keys.control, keys.hpri, keys.lpri , 0, function onPop(err, data) {
            logger.debug('onPop(err, data)',[err, data]);
            //technical DEBT dou to REDIS unsupported functionality
            //BRPOPLPUSH from multiple sources OR LUA Scripting
            rcli.lpush(aux_queue_id, data[1], function onPush(err){
                var obj = JSON.parse(data[1]);
                callback(err, { queueId: data[0], task: obj });
            });

    });

}

function get_pending(idconsumer, callback){
    "use strict";
    logger.debug('get_pending(idconsumer, callback)',[idconsumer, callback]);

    rcli.rpop(idconsumer, function onPendingData(err, data){
        var obj = JSON.parse(data);
        if(callback){callback(err, { queueId: 'PendingRecovery', task: obj });}
    });
}

function rem_processing_queue(idconsumer, callback) {
    "use strict";
    logger.debug('rem_processing_queue(idconsumer, callback)', [idconsumer, callback]);
    rcli.del(idconsumer, callback);
}

exports.put = put;
exports.get = get;
exports.rem_processing_queue = rem_processing_queue;
exports.get_pending = get_pending;
