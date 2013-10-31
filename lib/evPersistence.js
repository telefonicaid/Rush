//Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U
//
//This file is part of RUSH.
//
//  RUSH is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public
//  License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later
//  version.
//  RUSH is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty
//  of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
//
//  You should have received a copy of the GNU Affero General Public License along with RUSH
//  . If not, seehttp://www.gnu.org/licenses/.
//
//For those usages not covered by the GNU Affero General Public License please contact with::dtc_support@tid.es

var MG = require('./myGlobals').C;
var db = require('./dbRelayer');
//var config_global = require('./config.js');

var path = require('path');
var log = require('./logger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

function init(emitter) {
  'use strict';

  logger.debug('Initializing Persistence Listener', { op: 'INIT PERSISTENCE LISTENER', arguments: [emitter]});

  return function(callback) {

    emitter.on(MG.EVENT_NEWSTATE, function onNewEvent(data) {

      if (data.state === MG.STATE_ERROR || data.state === MG.STATE_COMPLETED ||
          //State info can only be stored when X-Relayer-Persistece is set
          (data.task.headers[MG.HEAD_RELAYER_PERSISTENCE] &&
          (data.state === MG.STATE_QUEUED || data.state === MG.STATE_PROCESSING))) {

        var type, respObj;

        if (data.state === MG.STATE_QUEUED || data.state === MG.STATE_PROCESSING) {
          type = TYPE_STATE;   //Notice the difference bt. 'STATE' and 'STATUS'
          respObj = { id: data.task.id, state: data.state };
        } else {
          type = data.state === MG.STATE_ERROR ? TYPE_ERROR : data.task.headers[MG.HEAD_RELAYER_PERSISTENCE];
          respObj = data.result || data.err || {};
          respObj.state = data.state;
        }

        doPersistence(data.task, respObj, type, function(error, result) {
          if (error || result) {
            var st = {
              id: data.task.id,
              traceID: data.task.traceID,
              state: MG.STATE_PERSISTENCE,
              date: new Date(),
              task: data.task,
              err: error,
              result: result
            };
            emitter.emit(MG.EVENT_NEWSTATE, st);
          }
        });
      }
    });

    callback(null, 'ev_persistence OK');
  };
}

function copyObj(obj) {

  var copy = {};

  for (var attr in obj) {
    copy[attr] = obj[attr];
  }

  return copy;
}

var TYPE_STATE = 'STATE', TYPE_ERROR = 'ERROR';

function setObject(task, respObj, type, callback) {
  'use strict';
  //remove from response what is not needed
  var errMsg,
      traceID = task.traceID,
      setObj = {};
  type = type.toUpperCase();

  setObj = copyObj(respObj);
  switch (type) {
    case 'STATUS':
      delete setObj.headers;
    /* fall-through */
    case 'HEADER':
      delete setObj.body;
      delete setObj.encoding;
      break;
  }

  if (!setObj.traceID) {
    delete setObj.traceID;
  }

  db.update(task.id, setObj, traceID, task.user, function onUpdated(err) {

    if (err) {
      logger.warning('Redis Error', { op: 'PERSISTENCE', userID: task.user, correlator: traceID,
        transid: task.id, error: err });
    } else {
      logger.info('Persistence Completed', { op: 'PERSISTENCE', userID: task.user, correlator: traceID,
        transid: task.id, state: setObj.state});
    }

    if (callback) {
      callback(err, setObj);
    }
  });
}

function doPersistence(task, respObj, type, callback) {
  'use strict';

  var validValues = MG.ACCEPTED_PERSISTENCE.slice();    //A copy is needed because the array will be modified
  validValues.push(TYPE_ERROR);                         //Type Error (Internal Value)
  validValues.push(TYPE_STATE);                         //Type State (Internal Value)

  if (validValues.indexOf(type) >= 0) {
    task.traceID = task.traceID;
    setObject(task, respObj, type, callback);
  } else {
    if (!type && callback) {
      callback(null, null);
    } else {
      if (callback) {
        //Error
        var errMsg = type + ' is not a valid value for ' + MG.HEAD_RELAYER_PERSISTENCE;
        logger.warning(errMsg, { op: 'PERSISTENCE', userID: task.user, correlator: task.traceID,
          transid: task.id });
        callback(errMsg);
      }
    }
  }
}

exports.init = init;

//require('./hookLogger.js').init(exports, logger);
