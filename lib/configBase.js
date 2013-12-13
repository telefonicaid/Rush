//Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U
//
//This file is part of RUSH.
//
//  RUSH is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public
//  License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later
//  version.
//  RUSH is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty
//  of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
//
//  You should have received a copy of the GNU Affero General Public License along with RUSH
//  . If not, seehttp://www.gnu.org/licenses/.
//
//For those usages not covered by the GNU Affero General Public License please contact with::dtc_support@tid.es

//var nextAgent = require ('../node_modules/node-next-agent');
var ForeverAgent = require ('../node_modules/forever-agent');


//var dirPrefix = process.env.RUSH_DIR_PREFIX || '';
/*
 Hostname.
 name of Rush instance host. DO NOT TOUCH!!!
 */


var HOSTNAME = require('os').hostname();

/* MONITORING PROBE CONFIGURATION
 ======================

 Monitoring interval: the monitoring probe will write the current statistics with
 this periodicity (in milliseconds).
 */
exports.probeInterval = 10 * 60 * 1000;

/**
 * Sets the maximum length for the queue where the monitoring data will be inserted
 * for each machine.
 */
exports.monitoringQueueMaxLength = 12;

/* REDIS CONFIGURATION
 ======================
 Redis database to be used by this instance of Rush.
 Each Redis provides 16 DataBases.
 Use 0 by default
 */
exports.selectedDB = 0;

/*
 State the max memory that will be used by Redis,
 it will be used in order to limit the size of the task queue
 */
exports.redisMaxMemory = 463260016*10;

/*
 Parameter used to stablish an extension namespace at Redis. DO NOT TOUCH!!!!.
 */
exports.dbrelayer = {keyPrefix: 'wrH:'};

/*
 Aux Redis host.
 Just used if the “sentinels” property is empty. Allow non HA Redis configurations
 */


/*
 Establish the DB where the requests queue will be located
 */
exports.queue = {redisHost:'localhost', redisPort:6379};


/*
 Establish the default expiration time in Redis (inteval-seconds) for the persistence policy
 */
exports.expireTime = 60 * 60;

/*
 Retry buckets
 When a petition fails it will be inserted on a bucket (every time on one different: from the first one to the last one)
 Petitions inserted on a bucket will be retried sometime in the future.
 This property defines when petitions should be retried.
 The number of elements in this array will establish the number of buckets
 */
exports.retryBuckets = [1, 10, 60];


/*
 HIGH AVAILABILITY CONFIGURATION
 ===============================
 */


/*
 Sentinels.
 contains an object array stating the list of available Redis Sentinels
 Example: [{host:’HOST’, port:PORT},{host:’HOST2’, port:PORT}]
 */
exports.sentinels = [];


/*
 RedisMasterName.
 name of the Redis DB that is going to be used as master in the HA architecture
 */
exports.redisMasterName = 'mymaster2';


/*
 LongFailingTimeout.
 states the waiting time for a Redis response
 */
exports.longFailingTimeout = 10000;


/*
 MinQuorum.
 min number of Redis sentinels that is needed to claim that some DB is dropped
 */
exports.minQuorum = 2;


/* LISTENER AND CONSUMER CONFIGURATION
 ======================================
 */

//Create Object container for further options. Do not touch!
exports.listener = {};


/*
 UnsecurePort.
 Port number for the http server
 */
exports.listener.unsecurePort = 5001;


/*
 EnableSecure.
 States if the https server is enabled
 */
exports.listener.enableSecure = true;


/*
 SecurePort.
 Port number fot the https server
 */
exports.listener.securePort = 5002;


/*
 CrtPath.
 Path for the signed certificates directory. Only .crt files. Ignored if empty string ('')
 */
exports.listener.crtPath = '';


/*
 Consumer_id.
 Unique identifier of the consumers node. It is important in order to check and recover processing task
 in case of system crash. Usually it should be function of HOSTNAME
 */
exports.consumerID = 'consumerA:';



//Create Object container for further options. Do not touch!
exports.consumer = {};


/* MaxPoppers.
 Max number for concurrent request queue poppers and target requests
 */
exports.consumer.maxPoppers = 500;

// agent: undefined -> globalAgent | false -> no agent. node HTTP Agent
/* exports.consumer.agent = nextAgent.Agent({
 keepAlive: true,
 maxSockets: 16,
 maxFreeSockets: 16
 });
 */

exports.consumer.agent = new ForeverAgent({
 keepAlive: true,
 maxSockets: 16,
 minSockets: 16
 });




/* MaxSockets.
 Max number of concurrent sockets a consumer can create to the same target host.
 Agent config. Recomended === maxPoppers if the target host set is small
 */
exports.consumer.maxSockets = 500;


/*
 ResponseTimeout.
 Waiting time for the target server response. Until response begins to arrive.
 */
exports.consumer.responseTimeout = 15000;


/*
 BrpopTimeout.
 Time a consumer will block on the task queue. If no task is available, the consumer will do a new brbpop on the queue
 with this timeout. Seconds
 */
exports.consumer.brpopTimeout = 15*60;

/*
 TrustAllServers.
 States if a valid certificate is needed to send the request to the target server
 */
exports.consumer.trustAllServers = true; // true, false


/*
 CasDir.
 Path for the signed certificates directory. Only .crt files. Ignored if empty string ('')
 */
exports.consumer.casDir = '../utils/certs';


//exports.consumer.proxy =  "http://proxy:port";




/*
 LOGGER CONFIGURATION
 ====================
 Levels for logger:
 debug
 warn
 error
 @type {String}
 */

//Create Object container for further options. Do not touch!
exports.logger = {};

/*
 InspectDepth.
 Level of depth an object will be inspected for the log.
 */
exports.logger.inspectDepth = 2;

/*
 Console.
 Verbosity level for the consumer console log
 */
exports.logger.Console = {
  level: 'info',
  timestamp: true
};

/*
 Limit the number of characters of the retrieved target body in logs
*/

exports.logger.prefixBody = 50;


/*
 File.
 Verbosity level, filename, size and max number of files for the consumer file log
 */
exports.logger.File = {
  level: 'info',
  filename: 'Rush_' + HOSTNAME + '.log',
  timestamp: true,
  exitOnWriteError: true,
  numLogWorkers: 2
};

/*
 ADDONS CONFIGURATION     (Advanced Configuration)
 =====================
 */

/*
 /* Gevlsnr_mongo.
 Host of the event listener. If there's an en environment variable stating this host it
 will be switched to that one.
 */
var gevlsnrMongo = 'localhost';
if (process.env.RUSH_GEN_MONGO) {
  gevlsnrMongo = process.env.RUSH_GEN_MONGO;
}


var gevLsnr = {};
gevLsnr.name = 'gevLsnr';
gevLsnr.mongoHost = gevlsnrMongo;
gevLsnr.mongoPort = 27017;
gevLsnr.mongoDB = 'rush';
gevLsnr.collection = 'RushGeneric';
gevLsnr.filter = { state: 'error'};
gevLsnr.take = {id: 'id', topic: 'topic', body: 'task.body',
  statusCode: 'result.statusCode'};


/* EvModules.
 Arrays that contains the addons implemented for the listener or consumer. If you want
 to insert a new addon add a new object "module" to the array
 */
exports.consumer.evModules = [
  {module: './evCallback'},
  {module: './evPersistence'},
  {module: './evMonitor'}
//    ,{module: './gevLsnr', config: gevLsnr}
];


exports.listener.evModules = [
  {module: './evPersistence'}
];
