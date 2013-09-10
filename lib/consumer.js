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

var configGlobal = require('./configBase.js');
var path = require('path');
var log = require('./logger');
log.setConfig(configGlobal.consumer.logger);
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');


var store = require('./taskQueue.js');
var service_router = require('./serviceRouter');
var dbCluster = require('./dbCluster.js');

var G = require('./myGlobals').C;
var emitter = require('./emitterModule.js').get();

var obsQueues = service_router.getQueues();

var maxPoppers = configGlobal.consumer.maxPoppers;

var async = require('async');
var evModules = configGlobal.consumer.evModules;
evModules = evModules.filter(function(x) { return x; });  //Remove empty elements
var evInitArray = evModules.map(function(x) {
  'use strict';
  return require(x.module).init(emitter, x.config);
});

logger.info('Node Version ' + process.versions.node, { op: 'CONSUMER START UP' });
logger.info('V8 Version ' + process.versions.v8, { op: 'CONSUMER START UP' });
logger.info('Current Directory ' + process.cwd(), { op: 'CONSUMER START UP' });
logger.info('RUSH_DIR_PREFIX: ' + process.env.RUSH_DIR_PREFIX, { op: 'CONSUMER START UP' });
logger.info('RUSH_GEN_MONGO: ' + process.env.RUSH_GEN_MONGO, { op: 'CONSUMER START UP' });

async.parallel(evInitArray,
    function onSubscribed(err, results) {
      'use strict';
      if (err) {
        logger.error('Error subscribing event listener', { op: 'ADD-ONS START UP', error: err });
        var errx = new Error(['error subscribing event listener', err]);
        errx.fatal = true;
        throw errx;
      }
    });


function consume(idconsumer, start) {
  'use strict';

  if (start) {
    store.getPending(idconsumer, processingConsumedTask);
  } else {
    store.get(obsQueues, idconsumer, processingConsumedTask);
  }

  function processingConsumedTask(err, job) {
    var st;
    if (err) {
      logger.warning('Redis Error retrieving tasks', { op: 'CONSUME', error: err });
      var errev = {
        idConsumer: idconsumer,
        //no topic avaliable
        err: err,
        date: new Date()
      };
      emitter.emit(G.EVENT_ERR, errev);
    } else {
      if (job && job.task) {

        var traceID = job.task.traceID;

        //EMIT PROCESSING
        st = {
          id: job.task.id,
          traceID: job.traceID,
          state: G.STATE_PROCESSING,
          date: new Date(),
          task: job.task,
          idConsumer: idconsumer
        };
        emitter.emit(G.EVENT_NEWSTATE, st);

        if (job.queueId !== obsQueues.control) {
          var do_job = service_router.getWorker(job);
          do_job(job.task,
              function onJobEnd(dojoberr, jobresult) { //job results add
                if (dojoberr) {
                  logger.warning('Job Error', { op: 'CONSUME', userID: job.task.user, correlator: traceID,
                      error: dojoberr, transid: job.task.id });
                  //EMIT ERROR
                  var errev = {
                    id: job.task.id,
                    traceID: job.task.traceID,
                    date: new Date(),
                    err: dojoberr
                  };
                  emitter.emit(G.EVENT_ERR, errev);
                  //EMIT ERROR STATE
                  st = {
                    id: job.task.id,
                    traceID: job.task.traceID,
                    state: G.STATE_ERROR,
                    date: new Date(),
                    task: job.task,
                    idConsumer: idconsumer,
                    result: dojoberr
                  };
                  emitter.emit(G.EVENT_NEWSTATE, st);
                }

                else {
                  var logresult = {}
                  for (var p in jobresult) {
                    if(jobresult.hasOwnProperty(p)) {
                      logresult[p] = jobresult[p];
                    }
                  }
                  if(logresult.body) {
                    if(typeof logresult.body === 'string' && configGlobal.consumer.logger.prefixBody > 0)  {
                      logresult.prefixBody = logresult.body.slice(0,configGlobal.consumer.logger.prefixBody);
                    }
                      delete logresult.body;
                  }
                  logger.info('Job Ended', { op: 'CONSUME', userID: job.task.user, correlator: traceID,
                      result: logresult, transid: job.task.id });
                  //EMIT COMPLETED
                  st = {
                    id: job.task.id,
                    traceID: job.task.traceID,
                    state: G.STATE_COMPLETED,
                    date: new Date(),
                    task: job.task,
                    result: jobresult
                  };
                  emitter.emit(G.EVENT_NEWSTATE, st);
                }
                store.remProcessingQueue(idconsumer, function onRemoval(err) {
                  if (err) {
                    logger.warning('Error removing processing queue', { op: 'CONSUME', userID: job.task.user,
                      correlator: traceID, transid: job.task.id ,error: err });
                    //EMIT ERROR
                    var errev = {
                      idConsumer: idconsumer,
                      date: new Date(),
                      err: err};
                    emitter.emit(G.EVENT_ERR, errev);
                  } else {
                    process.nextTick(function consumer_closure() {
                      consume(idconsumer, false);
                    });
                  }
                });

              });
        }
        //else {  /* control */
        // nothing
        //}
      } else {
        process.nextTick(function consumer_closure() {
          consume(idconsumer, false);
        });
      }
    }
  }
}

function start(done){
  dbCluster.init(function(err){
    if(!err){
      startConnections(done);
      logger.info('Consumer started', { op: 'CONSUMER START UP' });
    } else {
      logger.error('consumer could not be started', { op: 'CONSUMER START UP', error: err });

      if (done) {
        done(err);
      }
    }
  });
}

function startConnections(done) {
  store.openConnections(function() {
    for (var i = 0; i < maxPoppers; i++) {
      consume(configGlobal.consumer_id + i, true);
    }

    if (done) {
      done();
    }
  });
}

function stop(done) {
  store.closeConnections(done);
}

process.on('uncaughtException', function (err) {
    console.error("Global exception caught. Shutting down");
    process.exit(1);
});


dbCluster.connectionChanged.on('down', stop);
dbCluster.connectionChanged.on('up', startConnections);

exports.start = start;
exports.stop = stop;
