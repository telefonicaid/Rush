//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

// redis host
exports.queue= {};
exports.queue.redis_host = 'Relay1';

exports.dbrelayer = {};
exports.dbrelayer.key_prefix = 'wrH:';
exports.dbrelayer.redis_host = 'Relay1';
exports.expire_time = 60;

exports.consumer_id = "consumerA:";

exports.ev_lsnr = {};
exports.ev_lsnr.mongo_host = "tac01";
exports.ev_lsnr.mongo_port = 27017;
exports.ev_lsnr.mongo_db =  'rush';
exports.ev_lsnr.collectionState= 'RushState';
exports.ev_lsnr.collectionError= 'RushError';
