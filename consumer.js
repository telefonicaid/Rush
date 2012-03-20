var http = require('http');
var store = require('./task_queue.js');
var service_router= require('./service_router');
var logger = require('./logger.js')
var C = require('./config_base.js');
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
        }
        else if(resp && resp.task){
            logger.info("resp", resp);
            //EMIT PROCESSING
            if (resp.queueId !== obsQueues.control) {
                do_job = service_router.getWorker(resp);
                do_job(resp.task, function onJobEnd(dojoberr){
                    if (dojoberr){
                        logger.error("ERROR_________________", dojoberr);
                        //EMIT ERROR
                    }
                    else{
                        //EMIT COMPLETED
                    }
                    store.rem_processing_queue(idconsumer, function onRemoval(err){
                        if(err){
                            logger.error("ERROR_________________", err);
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
