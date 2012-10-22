//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//


/**
 * Level for logger
 * debug
 * warning
 * error
 *
 * @type {String}
 */
exports.logger = {};
exports.logger.logLevel = 'debug';
exports.logger.inspectDepth = 1 ;
exports.logger.Console = { 
    level: 'debug', timestamp:true
};
exports.logger.File ={ 
    level:'debug', filename:'pditclogger.log', timestamp:true, json:false ,
    maxsize: 1024*1024,
    maxFiles: 3
};


exports.evModules = ['./ev_lsnr', './ev_callback', './ev_persistence'];


// redis host
exports.queue= {};
exports.queue.redis_host = 'localhost';

exports.dbrelayer = {};
exports.dbrelayer.key_prefix = 'wrH:';
exports.dbrelayer.redis_host = 'localhost';
exports.expire_time = 60*60;

exports.consumer_id = "consumerA:";

exports.ev_lsnr = {};
exports.ev_lsnr.mongo_host = "localhost";
exports.ev_lsnr.mongo_port = 27017;
exports.ev_lsnr.mongo_db =  'rush';
exports.ev_lsnr.collectionState= 'RushState';
exports.ev_lsnr.collectionError= 'RushError';

exports.listener = {};
exports.listener.port = 3001;
exports.listener.evModules = ['./ev_lsnr'];

exports.consumer = {};
exports.consumer.evModules = ['./ev_lsnr', './ev_callback', './ev_persistence'];
exports.consumer.max_poppers = 500;
// agent: undefined -> globalAgent | false -> no agent
exports.consumer.agent = undefined;
exports.consumer.max_sockets = 10;


