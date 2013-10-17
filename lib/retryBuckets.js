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

var path = require('path');
var config = require('./config.js');
var dbCluster = require('./dbCluster.js');
var emitter = require('./emitterModule').get();
var MG = require('./myGlobals').C;
var store = require('./taskQueue.js');
var router = require('./serviceRouter.js');
var log = require('./logger');

var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

var RETRY_BUCKETS = config.retryBuckets;
var BUCKET_PREFIX = 'bucket';
var FIRST_CHARCODE = "A".charCodeAt(0); //Needed to auto-create bucket names (bucketA, bucketB,...)

var intervals = [];

/*var removeAndInsert = "\
local task=ARGV[1]\n\
local id_consumer=KEYS[1]\n\
local bucket=KEYS[2]\n\
redis.call('del', id_consumer)\n\
return redis.call('rpush', bucket, task)\n\
";*/

/**
 *
 * @param task The task to be pushed on the bucket
 * @param error Error that arises when the task was being processed
 * @param maxRetry Max number of times that the task can be retried (each worker can define this with different values
 * and this module is worker independent). If this value is not present, task will be pushed on the bucket.
 * @param callback Callback to be called on error or success
 */
exports.insertOnBucket = function (task, error, maxRetry, callback) {

  var retried = task.retried || 0;

  if (typeof maxRetry === 'function') {
    callback = maxRetry;
    maxRetry = Number.MAX_VALUE;
  }

  if (retried >= maxRetry) {                      //Exceeded retry times
    callback(error, null);
  } else if (retried >= RETRY_BUCKETS.length) {   //No more buckets available

    logger.warning('No more buckets available', { op: 'INSERT ON BUCKET', userID: task.user, correlator: task.traceID,
      transid: task.id });

    callback(error, null);

  } else {

    var bucketName = BUCKET_PREFIX + String.fromCharCode(FIRST_CHARCODE + retried);
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
        state: MG.STATE_QUEUED,
        date: new Date(),
        task: task
      };
      emitter.emit(MG.EVENT_NEWSTATE, event);

      logger.info('Task inserted on bucket', { op: 'INSERT ON BUCKET', userID: task.user, correlator: task.traceID,
        transid: task.id, bucket: bucketName, bucketTime: bucketTime });

      callback(errPush, null);  //errPush will be null if no error arises
    });
  }
};

exports.initBucketTimers = function() {

  function repushBucketTasks(bucketName) {

    var db = dbCluster.getDb(bucketName);

    //Get all tasks from the bucket
    db.lrange(bucketName, 0, -1, function (errRange, data) {

      if (!errRange && data.length > 0) {

        //Remove bucket tasks
        db.del(bucketName, function(errDel) {

          if (!errDel) {

            //Function to push tasks on the main queue
            function insertOnMainQueue(errRoute, routeObj) {

              if (!errRoute) {
                store.put(routeObj.service, routeObj.task, function onWrittenReq(errWritten) {

                  if (!errWritten) {
                    logger.info('Task Repushed', { op: 'RESPUSH BUCKET TASKS', userID: task.user,
                      correlator: task.traceID, transid: task.id });
                  } else {
                    logger.warn('Error repushing task', { op: 'RESPUSH BUCKET TASKS', userID: task.user,
                      correlator: task.traceID, transid: task.id, error: errWritten });
                  }

                });
              } else {
                logger.warn('Error repushing task', { op: 'RESPUSH BUCKET TASKS', userID: task.user,
                  correlator: task.traceID, transid: task.id, error: errRoute });
              }

            }

            //Insert on the queue again (using the standard method: as listener)
            for (var i = 0; i < data.length; i++) {
              var task = JSON.parse(data[i]);
              router.route(task, insertOnMainQueue);
            }

          } else {
            logger.error('Error deleting bucket elements', { op: 'RESPUSH BUCKET TASKS' });
          }

        });

      } else if (errRange) {
        logger.error('Error getting bucket elements', { op: 'RESPUSH BUCKET TASKS' });
      }
    });

  }

  //Init bucket timers
  for (var i = 0; i < RETRY_BUCKETS.length; i++) {
    var bucketName = BUCKET_PREFIX + String.fromCharCode(FIRST_CHARCODE + i);
    var intervalTime = RETRY_BUCKETS[i] * 2 * 1000;
    var interval = setInterval(repushBucketTasks.bind({}, bucketName), intervalTime);
    intervals.push(interval);
  }

};

exports.stopTimers = function() {

  for (var i = 0; i < intervals.length; i++) {
    clearInterval(intervals[i]);
  }

  intervals = [];
};