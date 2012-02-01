/**
 * Created by JetBrains WebStorm.
 * User: brox
 * Date: 31/01/12
 * Time: 18:59
 * To change this template use File | Settings | File Templates.
 */
var redis = require("redis");

// ?????? Pool grande de conexiones a redis? Tiene sentido???

var rcli = redis.createClient(redis.DEFAULT_PORT, '10.95.8.182');
var rcli2 = redis.createClient(redis.DEFAULT_PORT, '10.95.8.182');


redis.debug_mode = true;

function put(key, obj, err_fun) {

    console.log("in  put");

    var simple_req_str = JSON.stringify(obj);

    console.log("simple_req_str: "+ simple_req_str);

    rcli.lpush(key, simple_req_str,err_fun);
}

function get(keys, callback) {

    console.log("keys");
    console.dir(keys);

    rcli2.brpop(keys.control, keys.hpri, keys.lpri , 0, function(err, data) {
            console.log("data");
            console.dir(data);

            var obj = JSON.parse(data[1]);
            callback(err, { queueId: data[0], task: obj });
    });

}


exports.put = put;
exports.get = get;
