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


