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

var dir_prefix = process.env.RUSH_DIR_PREFIX || '';
var HOSTNAME = require('os').hostname();

exports.selectedDB = 0;

exports.sentinels = [];
exports.redisMasterName = 'mymaster2';
exports.longFailingTimeout = 10000;

exports.minQuorum = 2;

exports.pool = {};
exports.pool.maxElems = 500;

exports.redisMaxMemory=463260016*10;

exports.dbrelayer = {};
exports.dbrelayer.keyPrefix = 'wrH:';

exports.queue = {};
exports.queue.redisHost = 'localhost'; //Aux host if sentinels is empty (backward compatibility)
exports.queue.redisPort = 6379; //Aux port if sentinels is empty (backward compatibility)

exports.expireTime = 60 * 60;

exports.consumer_id = 'consumerA:';

//exports.evLsnr = {};
//exports.evLsnr.mongoHost = 'localhost';
//exports.evLsnr.mongoPort = 27017;
//exports.evLsnr.mongoDB = 'rush';
//exports.evLsnr.collectionState = 'RushState';
//exports.evLsnr.collectionError = 'RushError';

exports.listener = {};
exports.listener.unsecurePort = 5001;
exports.listener.enableSecure = true;
exports.listener.securePort = 5002;
exports.listener.crtPath = '';

exports.consumer = {};
exports.consumer.maxPoppers = 30;
// agent: undefined -> globalAgent | false -> no agent
exports.consumer.agent = undefined;
exports.consumer.maxSockets = 100;
exports.consumer.responseTimeout = 15000; // Until response begins to come
exports.consumer.trustAllServers = true; // true, false

exports.consumer.casDir = '../utils/certs' //Dir where the CAs signed certificates are located
                                           //Ignore if empty string (''). Only .crt files.

//exports.consumer.proxy =  "http://proxy:port";

/**
 * Level for logger
 * debug
 * warning
 * error
 *
 * @type {String}
 */

exports.consumer.logger = {};
exports.consumer.logger.logLevel = 'error';
exports.consumer.logger.inspectDepth = 1;
exports.consumer.logger.Console = {
  level: 'debug', timestamp: true
};

exports.consumer.logger.File = {
  level: 'debug', filename: 'Rush_consumer_' + HOSTNAME + '.log',
  timestamp: true, json: false,
  maxsize: 1024 * 1024, maxFiles: 3
};


exports.listener.logger = {};
exports.listener.logger.logLevel = 'error';
exports.listener.logger.inspectDepth = 1;
exports.listener.logger.Console = {
  level: 'debug', timestamp: true
};
exports.listener.logger.File = {
  level: 'debug', filename: 'Rush_listener_' + HOSTNAME + '.log',
  timestamp: true, json: false,
  maxsize: 1024 * 1024, maxFiles: 3
};


/* generic event listener */
var gevlsnr_mongo = 'localhost';
if (process.env.RUSH_GEN_MONGO) {
    gevlsnr_mongo = process.env.RUSH_GEN_MONGO;
}

//var gevLsnr = {};
//gevLsnr.name = 'gevLsnr';
//gevLsnr.mongoHost = gevlsnr_mongo;
//gevLsnr.mongoPort = 27017;
//gevLsnr.mongoDB = 'rush';
//gevLsnr.collection = 'RushGeneric';
//gevLsnr.filter = { state: 'error'};
//gevLsnr.take = {id: 'id', topic: 'topic', body: 'task.body',
//  statusCode: 'result.statusCode'};

exports.consumer.evModules = [
    {module: './evCallback'},
    {module: './evPersistence'},
//    ,{module: './gevLsnr', config: gevLsnr}
];

exports.listener.evModules = [
    {module: './evPersistence'},
];
