var http = require('http');
var store = require('./task_queue.js');
var service_router= require('./service_router');
var logger = require('./logger.js')
var obsQueues =service_router.getQueues();


function consume() {

        store.get(obsQueues, function (err, resp) {
                if (err) {
                    logger.error("ERROR_________________", err);
                }
                else {
                    logger.info("resp", resp);

                    if (resp.queueId !== obsQueues.control) {
                        do_job = service_router.getWorker(resp);
                        do_job(resp.task);
                    }
                    else {  /* control */

                    }
                }
                process.nextTick(consume);
            }
        );
}

consume();
