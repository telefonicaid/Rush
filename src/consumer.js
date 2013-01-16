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

var configGlobal = require('./config_base.js');
var path = require('path');
var log = require('PDITCLogger');
log.setConfig(configGlobal.consumer.logger);
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

var http = require('http');
var store = require('./task_queue.js');
var service_router = require('./service_router');

var G = require('./my_globals').C;
var emitter = require('./emitter_module.js').get();

var obsQueues = service_router.getQueues();

var max_poppers = configGlobal.consumer.max_poppers;

var async = require('async');
var evModules = configGlobal.consumer.evModules;
var evInitArray = evModules.map(function(x) {
  'use strict';
  return require(x.module).init(emitter, x.config);
});

logger.info('Node version:', process.versions.node);
logger.info('V8 version:', process.versions.v8);
logger.info('Current directory: ' + process.cwd());
logger.info('RUSH_DIR_PREFIX: ', process.env.RUSH_DIR_PREFIX);
logger.info('RUSH_GEN_MONGO: ', process.env.RUSH_GEN_MONGO);

async.parallel(evInitArray,
    function onSubscribed(err, results) {
      'use strict';
      logger.debug('onSubscribed(err, results)', [err, results]);
      if (err) {
        logger.error('error subscribing event listener', err);
        var errx = new Error(['error subscribing event listener', err]);
        errx.fatal = true;
        throw errx;
      }
      else {
        for (var i = 0; i < max_poppers; i++) {
          consume(configGlobal.consumer_id + i, true);
        }
      }
    });


function consume(idconsumer, start) {
  'use strict';
  logger.debug('consume(idconsumer, start)', [idconsumer, start]);

  if (start) {
    store.getPending(idconsumer, processingConsumedTask);
  } else {
    store.get(obsQueues, idconsumer, processingConsumedTask);
  }

  function processingConsumedTask(err, job) {
    logger.debug('processingConsumedTask(err, resp)', [err, job]);

    var st;
    if (err) {
      logger.warning('processingConsumedTask', err);
      var errev = {
        idConsumer: idconsumer,
        //no topic avaliable
        err: err,
        date: new Date()
      };
      emitter.emit(G.EVENT_ERR, errev);
    } else {
      if (job && job.task) {
        logger.debug('processingConsumedTask - resp', job);
        //EMIT PROCESSING
        st = {
          id: job.task.id,
          topic: job.task.headers[G.HEAD_RELAYER_TOPIC],
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
                logger.debug('onJobEnd(dojoberr, jobresult)',
                    [dojoberr, jobresult]);
                if (dojoberr) {
                  logger.warning('onJobEnd', dojoberr);
                  //EMIT ERROR
                  var errev = {
                    id: job.task.id,
                    topic: job.task.headers[G.HEAD_RELAYER_TOPIC],
                    date: new Date(),
                    err: dojoberr
                  };
                  emitter.emit(G.EVENT_ERR, errev);
                  //EMIT ERROR STATE
                  st = {
                    id: job.task.id,
                    topic: job.task.headers[G.HEAD_RELAYER_TOPIC],
                    state: G.STATE_ERROR,
                    date: new Date(),
                    task: job.task,
                    idConsumer: idconsumer,
                    result: dojoberr
                  };
                  emitter.emit(G.EVENT_NEWSTATE, st);
                }

                else {
                  //EMIT COMPLETED
                  st = {
                    id: job.task.id,
                    topic: job.task.headers[G.HEAD_RELAYER_TOPIC],
                    state: G.STATE_COMPLETED,
                    date: new Date(),
                    task: job.task,
                    result: jobresult
                  };
                  emitter.emit(G.EVENT_NEWSTATE, st);
                }
                store.remProcessingQueue(idconsumer, function onRemoval(err) {
                  logger.debug('onRemoval(err)', [err]);
                  if (err) {
                    logger.warning('onRemoval', err);
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


process.on('uncaughtException', function onUncaughtException(err) {
  'use strict';
  logger.error('onUncaughtException', err);

  if (err && err.fatal) {
    setTimeout(function() {
      process.exit();
    }, 1000);
    process.stdout.end();
  }
});


