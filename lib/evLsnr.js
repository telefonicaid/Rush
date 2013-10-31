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


var mongodb = require('mongodb');

var G = require('./myGlobals').C;
var configGlobal = require('./config.js');
var config = configGlobal.evLsnr;

var path = require('path');
var log = require('./logger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');


function init(emitter) {
  'use strict';

  logger.debug('Initializing evLsnr', { op: 'INIT EVENT LISTENER', arguments: [emitter]});

  return function(cbAsync) {
    var callback = function(error, result) {
      cbAsync(error ? 'evLsnr ' + String(error) : null,
          ! error ? 'ev_lsnr OK' : null);
    };
    var client = new mongodb.Db(config.mongoDB,
        new mongodb.Server(config.mongoHost, config.mongoPort, {}));

    function subscribeStateCol(callback) {
      client.collection(config.collectionState, function(err, c) {
        if (err) {
          logger.warning('Could not open the collection', { op: 'INIT EVENT LISTENER (STATE)', error: err });
          if (callback) {
            callback(err);
          }
        } else {
          var collection = c;
          emitter.on(G.EVENT_NEWSTATE, function newEvent(data) {
            var traceID = data.task.traceID;
            try {
              collection.insert(data, function(err, docs) {
                if (err) {
                  logger.warning('Insert Error', { userID: data.task.user, correlator: traceID,
                    op: 'EVENT LISTENER (STATE)', transid: data.task.id, error: err });
                }
              });
            } catch (e) {
              logger.warning('Exception', { userID: data.task.user, correlator: traceID,
                op: 'EVENT LISTENER (STATE)', transid: data.task.id, error: e });
            }
          });
          if (callback) {
            callback(null);
          }
        }
      });
    }

    function subscribeErrorCol(callback) {
      client.collection(config.collectionError, function(err, c) {

        if (err) {
          logger.warning('Could not open the collection', { op: 'INIT EVENT LISTENER (ERRORS)', error: err });
          if (callback) {
            callback(err);
          }
        } else {
          var collection = c;
          emitter.on(G.EVENT_ERR, function newError(data) {
            var traceID = data.task.traceID;
            try {
              collection.insert(data, function(err, docs) {
                if (err) {
                  logger.warning('Insert Error', { userID: data.task.user, correlator: traceID,
                    op: 'EVENT LISTENER (ERRORS)', transid: data.task.id, error: err });
                }
              });
            } catch (e) {
              logger.warning('Exception', { userID: data.task.user, correlator: traceID,
                op: 'EVENT LISTENER (ERRORS)', transid: data.task.id, error: e });
            }
          });
          if (callback) {
            callback(null);
          }
        }

      });
    }

    client.open(function(err, pClient) {
      if (err) {
        logger.warning('Could not connect with MongoDB', { op: 'INIT EVENT LISTENER', error: err });
        if (callback) {
          callback(err);
        }
      } else {
        subscribeStateCol(function(err) {
          if (err) {
            callback(err);
          }
          else {
            subscribeErrorCol(callback);
          }
        });

      }
    });
  };
}

exports.init = init;

//require('./hookLogger.js').init(exports, logger);
