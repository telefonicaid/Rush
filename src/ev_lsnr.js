//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//


var mongodb = require('mongodb');

var G = require('./my_globals').C;
var config_global = require('./config_base');
var config = config_global.ev_lsnr;

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename,'.js');


function init(emitter) {
    "use strict";
    return function (cb_async) {
        var callback = function(error,result) {
             cb_async(error?"ev_lsnr "+String(error): null,
                      !error?"ev_lsnr OK": null);
        };
        var client = new mongodb.Db(config.mongo_db,
            new mongodb.Server(config.mongo_host, config.mongo_port, {}));

        function subscribeStateCol(callback) {
            client.collection(config.collectionState, function (err, c) {
                if (err) {
                    logger.warning('collection', err);
                    if (callback) {
                        callback(err);
                    }
                } else {
                    var collection = c;
                    emitter.on(G.EVENT_NEWSTATE, function new_event(data) {
                        try {
                            logger.debug('new_event', data);
                            collection.insert(data, function (err, docs) {
                                if (err) {
                                    logger.warning('insert', err);
                                } else {
                                    logger.debug('insert', docs);
                                }
                            });
                        } catch (e) {
                            logger.warning('new_event', e);
                        }
                    });
                    if (callback) {
                        callback(null);
                    }
                }
            });
        }

        function subscribeErrorCol(callback) {
            client.collection(config.collectionError, function (err, c) {

                if (err) {
                    logger.warning('collectionError', err);
                    if (callback) {
                        callback(err);
                    }
                } else {
                    var collection = c;
                    emitter.on(G.EVENT_ERR, function new_error(data) {
                        try {
                            logger.debug('new_error', data);

                            collection.insert(data, function (err, docs) {
                                if (err) {
                                    logger.warning('insert', err);
                                } else {
                                    logger.debug('insert', docs);
                                }
                            });
                        } catch (e) {
                            logger.warning('new_error', e);
                        }
                    });
                    if (callback) {
                        callback(null);
                    }
                }

            });
        }

        client.open(function (err, p_client) {
            if (err) {
                logger.warning('open', err);
                if (callback) {
                    callback(err);
                }
            } else {
                subscribeStateCol(function (err) {
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
