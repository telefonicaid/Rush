var http = require('http');
var store = require('./task_queue.js');
var service_router= require('./service_router');
var logger = require('./logger.js')
var C = require('./config_base.js');
var obsQueues =service_router.getQueues();

var max_poppers = 500;
function consume(idconsumer) {
        store.get(obsQueues, idconsumer, function (err, resp) {
                if (err) {
                    logger.error("ERROR_________________", err);
                }
                else {
                    logger.info("resp", resp);

                    if (resp.queueId !== obsQueues.control) {
                        do_job = service_router.getWorker(resp);
                        do_job(resp.task, function(){
                            store.rem_processing_queue(idconsumer, function onRemoval(err){
                              if(err){
                                  logger.error("ERROR_________________", err);
                              }
                              else{
                                 process.nextTick(function consumer_clousure(){consume(idconsumer)});
                              }
                            });

                         });
                    }
                    else {  /* control */

                    }
                }
            }
        );
}

for (var i=0;i<max_poppers;i++){
    consume(C.consumer_id+i);
}
