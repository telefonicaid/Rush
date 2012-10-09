//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

var http = require('http');
var store = require('./task_queue.js');
var service_router = require('./service_router');
var config_global = require('./config_base.js');
var G = require('./my_globals').C;
var emitter = require('./emitter_module.js').get();

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');
logger.setLevel(config_global.logLevel);

var obsQueues = service_router.getQueues();

var max_poppers = 500;


var ev_lsnr = require('./ev_lsnr');
ev_lsnr.init(emitter);
var ev_callback = require('./ev_callback');
ev_callback.init(emitter);
var ev_persistence = require('./ev_persistence');
ev_persistence.init(emitter);

function consume(idconsumer, start) {
    'use strict';
    logger.debug('consume(idconsumer, start)', [idconsumer, start]);

    if (start) {
        store.get_pending(idconsumer, processing_consumed_task);
    }
    else {
        store.get(obsQueues, idconsumer, processing_consumed_task);
    }

    function processing_consumed_task(err, resp) {
        'use strict';
        logger.debug('processing_consumed_task(err, resp)', [err, resp]);

        var st;
        if (err) {
            logger.warning("processing_consumed_task", err);
            var errev = {
                idConsumer:idconsumer,
                err:err,
                date:new Date()
            };
            emitter.emit(G.EVENT_ERR, errev);
        }
        else if (resp && resp.task) {
            logger.debug("processing_consumed_task - resp", resp);
            //EMIT PROCESSING
            st = {
                id:resp.task.id,
                state:G.STATE_PROCESSING,
                date:new Date(),
                task:resp.task,
                idConsumer:idconsumer
            };
            emitter.emit(G.EVENT_NEWSTATE, st);

            if (resp.queueId !== obsQueues.control) {
                var do_job = service_router.getWorker(resp);
                do_job(resp.task, function onJobEnd(dojoberr, jobresult) { //job results add
                    logger.debug('onJobEnd(dojoberr, jobresult)', [dojoberr, jobresult]);
                    if (dojoberr) {
                        logger.warning('onJobEnd', dojoberr);
                        //EMIT ERROR
                        var errev = {
                            id:resp.task.id,
                            date:new Date(),
                            err:dojoberr
                        };
                        emitter.emit(G.EVENT_ERR, errev);
                        //EMIT ERROR STATE
                        st = {
                            id:resp.task.id,
                            state:G.STATE_ERROR,
                            date:new Date(),
                            task:resp.task,
                            idConsumer:idconsumer,
                            err:dojoberr,
                            result:jobresult
                        };

                        emitter.emit(G.EVENT_NEWSTATE, st);
                    }

                    else {
                        //EMIT COMPLETED
                        st = {
                            id:resp.task.id,
                            state:G.STATE_COMPLETED,
                            date:new Date(),
                            task:resp.task,

                            result:jobresult
                        };
                        emitter.emit(G.EVENT_NEWSTATE, st);
                    }
                    store.rem_processing_queue(idconsumer, function onRemoval(err) {
                        logger.debug('onRemoval(err)', [err]);
                        if (err) {
                            logger.warning('onRemoval', err);
                            //EMIT ERROR
                            var errev = {
                                idConsumer:idconsumer,
                                date:new Date(),
                                err:err};
                            emitter.emit(G.EVENT_ERR, errev);
                        }
                        else {
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
        }
        else {
            process.nextTick(function consumer_closure() {
                consume(idconsumer, false);
            });
        }
    }
}


for (var i = 0; i < max_poppers; i++) {
    consume(config_global.consumer_id + i, true);
}
