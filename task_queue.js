/**
 * Created by JetBrains WebStorm.
 * User: brox
 * Date: 31/01/12
 * Time: 18:59
 * To change this template use File | Settings | File Templates.
 */
var redis = require('redis');
var config = require('./config_base').queue;
var logger = require('./logger.js');

// ?????? Pool grande de conexiones a redis? Tiene sentido???

var rcli = redis.createClient(redis.DEFAULT_PORT, config.redis_host);
var rcliBlocking = redis.createClient(redis.DEFAULT_PORT, config.redis_host);


//redis.debug_mode = true;

function put(key, obj, err_fun) {

    logger.info('in  put');

    var simple_req_str = JSON.stringify(obj);

    logger.info('simple_req_str: '+ simple_req_str);

    rcli.lpush(key, simple_req_str,err_fun);
}

function get(keys, aux_queue_id, callback) {

    logger.info('keys', keys);

    rcliBlocking.brpop(keys.control, keys.hpri, keys.lpri , 0, function onPop(err, data) {
            logger.info("data",data);
            //technical DEBT dou to REDIS unsupported functionality
            //BRPOPLPUSH from multiple sources OR LUA Scripting
            rcli.lpush(aux_queue_id, data[1], function onPush(err){
                var obj = JSON.parse(data[1]);
                callback(err, { queueId: data[0], task: obj });
            });

    });

}

function get_pending(idconsumer, callback){
    logger.info('Getting pending elem from: '+idconsumer);
    rcli.rpop(idconsumer, function onPendingData(err, data){
        var obj = JSON.parse(data);
        if(callback){callback(err, { queueId: 'PendingRecovery', task: obj });}
    });
}

function rem_processing_queue(idconsumer, callback) {
    logger.info('removing aux elem from: '+idconsumer);
    rcli.del(idconsumer, callback);
}

exports.put = put;
exports.get = get;
exports.rem_processing_queue = rem_processing_queue;
exports.get_pending = get_pending;
