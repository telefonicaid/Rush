var http = require('http');
var store = require('./task_queue.js');
var service_router= require('./service_router');
var logger = require('./logger.js');
var C = require('./config_base.js');
var G = require('./my_globals').C;
var emitter = require('./emitter_module.js').eventEmitter;

var obsQueues =service_router.getQueues();

var max_poppers = 500;
function consume(idconsumer, start) {
    if(start){
    store.get_pending(idconsumer, processing_consumed_task);
    }
    else{
    store.get(obsQueues, idconsumer,processing_consumed_task);
    }

    function processing_consumed_task(err, resp) {
        if (err) {
            logger.error("ERROR_________________", err);
            var errev = {
                err:err,
                state:G.STATE_PENDING,
                date: Date(),
                msg:'error getting pending task info',
                consumer_id: idconsumer
            };
            emitter.emit(G.EVENT_ERR, errev);
        }
        else if(resp && resp.task){
            logger.info("resp", resp);
            //EMIT PROCESSING
            var st = {
                id:resp.task.id,
                state:G.STATE_PROCESSING,
                date: Date(),
                task: resp.task,
                consumer_id: idconsumer
            };
            emitter.emit(G.EVENT_NEWSTATE, st);

            if (resp.queueId !== obsQueues.control) {
                var do_job = service_router.getWorker(resp);
                do_job(resp.task, function onJobEnd(dojoberr, jobresult){ //job results add
                    if (dojoberr){
                        logger.error("ERROR_________________", dojoberr);
                        //EMIT ERROR
                        var errev = {
                            err:dojoberr,
                            state:G.STATE_PENDING,
                            date: Date(),
                            msg:'error processing task' };
                        emitter.emit(G.EVENT_ERR, errev);
                        //EMIT ERROR STATE
                        var st = {
                            id:resp.task.id,
                            state:G.STATE_ERROR,
                            date: Date(),
                            task: resp.task,
                            consumer_id: idconsumer,
                            msg:'error processing task',
                            result:dojoberr
                        };

                        emitter.emit(G.EVENT_NEWSTATE, st);
                    }

                    else{
                        //EMIT COMPLETED
                        var st = {
                            id:resp.task.id,
                            state:G.STATE_COMPLETED,
                            date: Date(),
                            task: resp.task,
                            result: jobresult
                        };
                        emitter.emit(G.EVENT_NEWSTATE, st);
                    }
                    store.rem_processing_queue(idconsumer, function onRemoval(err){
                        if(err){
                            logger.error("ERROR_________________", err);
                            //EMIT ERROR
                            var errev = {
                                err:berr,
                                state:G.STATE_PENDING,
                                date: Date(),
                                msg:'error removing processing queu' };
                            emitter.emit(G.EVENT_ERR, errev);
                        }
                        else{
                            process.nextTick(function consumer_clousure(){consume(idconsumer, false)});
                        }
                    });

                });
            }
            else {  /* control */

            }
        }
        else{
            process.nextTick(function consumer_clousure(){consume(idconsumer, false)});
        }
    }
}

for (var i=0;i<max_poppers;i++){
      consume(C.consumer_id+i, true);
}
