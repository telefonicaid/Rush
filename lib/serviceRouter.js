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

//var worker_relay = require('./worker_relay');
var eventWorker = require('./eventWorker');
var MG = require('./myGlobals').C;
var configGlobal = require('./configBase.js');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');


/*
 ok: true/false
 service
 message
 */
function route(request, callback) {
  'use strict';

  logger.debug({ opType: 'ROUTE REQUEST', userID: request.user, traceID: request.id, msg: 'Arguments: '}, [ request ]);

  getTask(request, function(err, task) {
    if (err) {
      callback(err, null);
    }
    else {
      callback(null, { service: 'wrL:hpri', task: task});
    }
  });
}


function getQueues() {
  'use strict';

  logger.debug({ opType: 'GET QUEUES', msg: 'No arguments'});

  return {control: 'wrL:control',
    hpri: 'wrL:hpri',
    lpri: 'wrL:lpri' };
}

function getWorker(resp) {
  'use strict';

  logger.debug({ opType: 'GET WORKER', userID: resp.task.user, traceID: resp.task.id, msg: 'Arguments: '}, [ resp ]);

  // Select a worker based on resp data ( from task queue)
  return eventWorker.doJob;
}

function getTask(resp, callback) {
  'use strict';
  // Select a worker based on resp data ( from task queue)
  return eventWorker.createTask(resp, callback);
}

exports.route = route;
exports.getWorker = getWorker;
exports.getQueues = getQueues;

//require('./hookLogger.js').init(exports, logger);
