//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//


var mongodb = require('mongodb');

var G = require('./my_globals').C;
var config = require('./config_base').ev_lsnr;

var path = require('path');
var log = require('./logger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename,'.js');

var clients = [];

function init(emitter, callback) {
  "use strict";

  var client = new mongodb.Db(config.mongo_db,
    new mongodb.Server(config.mongo_host, config.mongo_port, {}));

  client.open(function(err, p_client) {
    if (err) {
      logger.warning('open', err);
      if (callback) {
        callback(err);
      }
    } else {
      client.collection(config.collectionState, function(err, c) {
        if (err) {
            logger.warning('collection', err);
            if (callback) {
            callback(err);
          }
        } else {
          var collection = c;
          emitter.on(G.EVENT_NEWSTATE, function new_event(data) {
            try {
              logger.debug("new_event", data);
              collection.insert(data, function(err, docs) {
                if (err) {
                    logger.warning('insert', err);
                } else {
                  logger.debug('insert', docs);
                }
              });
            } catch (e) {
                logger.warning('insert', e);
            }
          });
          if (callback) {
            callback(null);
          }
        }
      });

      client.collection(config.collectionError, function(err, c) {

          if (err) {
            logger.warning('collectionError', err);
            if (callback) {
              callback(err);
            }
          } else {
            var collection = c;
            emitter.on(G.EVENT_ERR, function new_error(data) {
                try {
                logger.debug("new_error", data);

              collection.insert(data, function(err, docs) {
                if (err) {
                    logger.warning('insert', err);
                } else {
                    logger.debug('insert', docs);
                }
              });
                } catch (e) {
                    logger.warning('insertError', e);
                }
            });
            if (callback) {
              callback(null);
            }
          }

      });
      clients.push(client);
    }
  });
}

exports.init = init;
