var http = require('http');
var store = require("task_queue.js");
var service_router= require("./service_router");

var obsQueues =service_router.getQueues();

function consume() {

        store.get(obsQueues, function (err, resp) {
                if (err) {
                    console.log("ERROR_________________");
                    console.dir(err);
                }
                else {
                    console.log("resp");
                    console.dir(resp);
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
