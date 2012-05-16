//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

var config = require('./config_base').dbrelayer;
var redis = require('redis');

var rcli = redis.createClient(redis.DEFAULT_PORT, config.redis_host);

function update(key, obj, cllbk) {
  'use strict';
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
  rcli.hmset(config.key_prefix + key, o_aux, function(err, res) {
    if (cllbk) {
      cllbk(err, res);
    }
  });
}

function get_data(key, callback) {
  'use strict';
  rcli.hgetall(config.key_prefix + key, function(err, data){
    if(err){
      callback(err);
    }
    else{
      callback(null, data);
    }
  });
}
exports.update = update;
exports.get_data = get_data;

