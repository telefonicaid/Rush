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


/*
 ok: true/false
 service
 message
 */
function route(request, callback) {
    'use strict';
    logger.debug("route(request)", [request]);
    getTask(request, function(err, task){
        if(err){
            callback({ok:false, message:err}, null);  
        }
        else{
            callback(null, { ok:true, service: 'wrL:hpri', task: task});
        }
    });
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
    return event_worker.doJob;
}

function getTask(resp, callback){
    "use strict";
    logger.debug("getTask(resp)", [resp]);
    // Select a worker based on resp data ( from task queue)
    return event_worker.createTask(resp, callback);
}

exports.route = route;
exports.getWorker = getWorker;
exports.getQueues = getQueues;

