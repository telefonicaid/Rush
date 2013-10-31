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
 * The monitoring probe is a timeout callback that will be executed periodically to
 * extract information about the node runtime and write it in redis. It will also
 * write the current date among this data, so the monitoring information can be
 * requested to check a node's health.
 *
 * The monitoring information will be written in a redis hash, with key the node
 * hostname and value the data structure.
 */
var dbCluster = require('./dbCluster.js'),
    configGlobal = require('./config.js'),
    async = require('async'),
    log = require('./logger'),
    path = require('path');

logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

/**
 * Get the total length of the request queue.
 */
function getQueueLength(callback) {
    var db = dbCluster.getDb();

    db.llen('wrL:hpri', callback);
}

/**
 * Call all the monitoring methods
 */
function getMonitoringData(callback) {
    async.series([
        getQueueLength
    ], callback);
}

/**
 * Build the monitoring data object that will be written to Redis. The current data
 * being proccessed is:
 *
 * - Current date
 * - Length of the redis queue.
 * - Memory consumed by node
 * - Name of the host who is sending the data
 *
 * @param results Array with the results of the previos data retrieving actions.
 */
function buildDataObject(results, callback) {
    var data = {
        currentDate: new Date().toUTCString(),
        queueLength: results[0],
        memory: process.memoryUsage(),
        name: require('os').hostname()
    };

    callback(null, JSON.stringify(data));
}

/**
 * Write the monitoring data to Redis.
 *
 * @param data  Data object to be written.
 */
function writeData(data, callback) {
    var db = dbCluster.getDb();

    async.series([
        db.lpush.bind(db, 'Monitoring', data),
        db.ltrim.bind(db, 'Monitoring', 0, configGlobal.monitoringQueueMaxLength)
    ], callback);
}

/**
 * This is main function of the monitoring, responsible of launching all the different
 * monitoring steps.
 */
function monitor() {
    async.waterfall([
        getMonitoringData,
        buildDataObject,
        writeData
    ], function(error, data) {
        if (error) {
            logger.error('Probe Error', { op: 'PROBE_ERROR', error: error });
        }
    });
}

/**
 * Sets the timer for the monitoring function.
 */
function startMonitorization() {
    logger.info('Starting monitoring probe', { op: 'START_MONITORING_PROBE'});
    setInterval(monitor, configGlobal.probeInterval);
}

exports.start = startMonitorization;
