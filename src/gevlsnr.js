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


var mongodb = require('mongodb');

var G = require('./my_globals').C;
var config_global = require('./config_base');
var config = require('./gevlsnrcfg');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');


function init(emitter) {
    "use strict";
    return function (cb_async) {
        var callback = function (error, result) {
            cb_async(error ? "gevlsnr " + String(error) : null,
                !error ? "gevlsnr OK" : null);
        };
        var client = new mongodb.Db(config.mongo_db,
            new mongodb.Server(config.mongo_host, config.mongo_port, {}));

        function subscribeStateCol(callback) {
            client.collection(config.collection, function (err, c) {
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
                            if (filterObj(data, config.filter)) {
                                var trimmed = trim(data, config.take);
                                collection.insert(trimmed, function (err, docs) {
                                    if (err) {
                                        logger.warning('insert', err);
                                    } else {
                                        logger.debug('insert', docs);
                                    }
                                });
                            }
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

        client.open(function (err, p_client) {
            if (err) {
                logger.warning('open', err);
                if (callback) {
                    callback(err);
                }
            } else {
                subscribeStateCol(function (err) {
                    callback(err);
                });
            }
        });
    };
}

exports.init = init;

function filterObj(obj, filter) {
    for (var p in filter) {
        if (filter.hasOwnProperty(p)) {
            if (obj[p] === filter[p]) {
                return true;
            }
        }
    }
    return false;
}

function trim(object,propertiesHash) {
   var resObj = {};

    for (var p in propertiesHash) {
        if (propertiesHash.hasOwnProperty(p)) {
            resObj[p] = extractField(object, propertiesHash[p]); ;
        }
    }
    return resObj;
}
function extractField(object, field) {
    var arrayFields = field.split('.'), fieldValue = object;
    for(var i =0; i < arrayFields.length; i++) {
        fieldValue = fieldValue[arrayFields[i]];
        if(fieldValue === null || fieldValue ===undefined || typeof fieldValue !== 'object') {
            return fieldValue;
        }
    }
}