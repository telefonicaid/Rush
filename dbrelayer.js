//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

var config = require('./config_base').dbrelayer;
var redis = require('redis');

var rcli = redis.createClient(redis.DEFAULT_PORT, config.redis_host);

function update(key, obj, cllbk) {
    var str; // aux var for stringify object properties
    var o_aux = {}; // auxiliar object to adapt to redis
    // redis client allows one depth level of nested objects, i.e. a plain object
    for(p in obj) {
        if(typeof obj[p] === 'object') {
             str = JSON.stringify(obj[p]);
            o_aux[p] = str;
        }
        else {
            o_aux[p] = obj[p];
        }
    }
    rcli.hmset(config.key_prefix + key, o_aux, function (err, res) {
        if (cllbk) cllbk(err, res);
    });
}

exports.update = update;

