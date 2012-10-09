//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

//var worker_relay = require('./worker_relay');
var event_worker = require('./event_worker');
var MG = require('./my_globals').C;
var config_global = require('./config_base.js');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename,'.js');
logger.setLevel(config_global.logLevel);

/*
 ok: true/false
 service
 message
 */
function route(request) {
    'use strict';
    logger.debug("route(request)", [request]);
    if (!request.headers[MG.HEAD_RELAYER_HOST]) {
        return { ok:false, message:MG.HEAD_RELAYER_HOST + ' is missing'};
    }
    else {
        return { ok:true, service: 'wrL:hpri'};
    }

}


function getQueues() {
    'use strict';
    logger.debug("getQueues()");
    return {control:'wrL:control',
        hpri: 'wrL:hpri',
        lpri: 'wrL:lpri' };
}

function getWorker(resp) {
    "use strict";
    logger.debug("getWorker(resp)", [resp]);
    // Select a worker based on resp data ( from task queue)
    return event_worker.do_job;
}

exports.route = route;
exports.getWorker = getWorker;
exports.getQueues = getQueues;

