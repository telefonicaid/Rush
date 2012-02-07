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
var rcli2 = redis.createClient(redis.DEFAULT_PORT, config.redis_host);


//redis.debug_mode = true;

function put(key, obj, err_fun) {

    logger.info('in  put');

    var simple_req_str = JSON.stringify(obj);

    logger.info('simple_req_str: '+ simple_req_str);

    rcli.lpush(key, simple_req_str,err_fun);
}

function get(keys, callback) {

    logger.info('keys', keys);

    rcli2.brpop(keys.control, keys.hpri, keys.lpri , 0, function(err, data) {
            logger.info("data",data);

            var obj = JSON.parse(data[1]);
            callback(err, { queueId: data[0], task: obj });
    });

}


exports.put = put;
exports.get = get;
