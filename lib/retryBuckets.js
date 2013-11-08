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

var async = require('async');
var path = require('path');
var config = require('./config.js');
var dbCluster = require('./dbCluster.js');
var emitter = require('./emitterModule').get();
var MG = require('./myGlobals').C;
var store = require('./taskQueue.js');
var router = require('./serviceRouter.js');
var log = require('./logger/logger');

var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

var RETRY_BUCKETS = config.retryBuckets;
var BUCKET_PREFIX = 'bucket';
var FIRST_CHARCODE = 'A'.charCodeAt(0); //Needed to auto-create bucket names (bucketA, bucketB,...)

var stopped;

var getTasksAndRepsuh = "\
local bucketName = KEYS[1]\n\
local serviceQueue = KEYS[2]\n\
local tasks = redis.call('lrange', bucketName, 0, -1)\n\
local size = table.getn(tasks)\n\
if size > 0 then\n\
  redis.call('lpush', serviceQueue, unpack(tasks))\n\
  redis.call('del', bucketName)\n\
end\n\
return tasks\n\
";

/**
 * Get bucket name
 * @param index Position on buckets array
 * @param service Service name
 * @returns {string} The name of the bucket
 */
function getBucketName(index, service) {
  return BUCKET_PREFIX + String.fromCharCode(FIRST_CHARCODE + index) + ':' + service;
}

/**
 *
 * @param task The task to be pushed on the bucket
 * @param error Error that arises when the task was being processed
 * @param maxRetry Max number of times that the task can be retried (each worker can define this with different values
 * and this module is worker independent).
 * @param callback Callback to be called on error or success
 */
exports.insertOnBucket = function (task, error, maxRetry, callback) {

  var retried = task.retried || 0;

  if (retried >= maxRetry) {                      //Exceeded retry times
    callback(error, null);
  } else if (retried >= RETRY_BUCKETS.length) {   //No more buckets available

    logger.warning('No more buckets available', { op: 'INSERT ON BUCKET', userID: task.user, correlator: task.traceID,
      transid: task.id });

    callback(error, null);

  } else {

    var bucketName = getBucketName(retried, task.service);
    var bucketTime = RETRY_BUCKETS[retried];
    var db = dbCluster.getDb(bucketName);

    //Increase retry times
    task.retried = retried + 1;

    //Insert
    //Task will be removed from the processing queue when callback is called.
    db.rpush(bucketName, JSON.stringify(task), function onPushed(errPush) {

      //EMIT STATE PENDING (status is "processing" again and need to be changed)
      var event = {
        id: task.id,
        traceID: task.traceID,
        state: MG.STATE_RETRY,
        date: new Date(),
        task: task
      };
      emitter.emit(MG.EVENT_NEWSTATE, event);

      logger.info('Task inserted on bucket', { op: 'INSERT ON BUCKET', userID: task.user, correlator: task.traceID,
        transid: task.id, bucket: bucketName, bucketTime: bucketTime });

      /**
       * errPush will be null if no error arises.
       * if errPush is null, task will be deleted from the aux queue, but its state won't be changed to
       * errored or completed
       */
      callback(errPush, null);
    });
  }
};

exports.initBucketTimers = function() {

  function repushBucketTasks(bucketName, serviceQueue, cb) {

    var db = dbCluster.getDb(bucketName);

    //Get all tasks from the bucket
    db.eval(getTasksAndRepsuh, 2, bucketName, serviceQueue, function (errEval, data) {
      if (!errEval && data.length > 0) {
        logger.info('Tasks repushed', { op: 'REPUSH BUCKET TASKS', tasks: data });
        cb();
      } else if (errEval) {
        logger.error('Error getting bucket elements', { op: 'RESPUSH BUCKET TASKS', error: errEval });
        cb();
      } else if (data.length === 0) {
        logger.debug('Empty bucket', { op: 'REPUSH BUCKET TASKS'});
        cb();
      }
    });
  }

  //Stop condition
  stopped = false;

  var services = router.getQueues();

  for (var service in services) {
    if (services.hasOwnProperty(service)) {

      RETRY_BUCKETS.forEach(function(bucketTimeout, index) {

        var serviceName = services[service];
        var bucketName = getBucketName(index, serviceName);
        var intervalTime = bucketTimeout * 2 * 1000;

        async.whilst(

            //Stop condition
            function() {
              return stopped === false;
            },

            //Function to be executed forever
            function (callback) {
              repushBucketTasks(bucketName, serviceName, function() {
                setTimeout(callback, intervalTime);
              })
            },

            //Function to be called on error
            function(err) {
              logger.error('Error processing respush', { op: 'BUCKET TIMER', error: err });
            }
        );

      });
    }
  }
};

exports.stopTimers = function() {
  stopped = true;
};