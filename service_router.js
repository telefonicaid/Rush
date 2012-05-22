//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

//var worker_relay = require('./worker_relay');
var event_worker = require('./event_worker');
var MG = require('./my_globals').C;
/*
 ok: true/false
 service
 message
 */
function route(request) {
    "use strict";
    if (!request.headers[MG.HEAD_RELAYER_HOST]) {
        return { ok:false, message:MG.HEAD_RELAYER_HOST + ' is missing'};
    }
    else {
        return { ok:true, service: 'wrL:hpri'};
    }

}


function getQueues() {
    "use strict";
    return {control:'wrL:control',
        hpri: 'wrL:hpri',
        lpri: 'wrL:lpri' };
}

function getWorker(resp) {
    "use strict";
    // Select a worker based on resp data ( from task queue)
    return event_worker.do_job;
}

exports.route = route;
exports.getWorker = getWorker;
exports.getQueues = getQueues;

