var http = require('http');
var MG = require('./my_globals').C;
var url = require('url');
var db = require('./dbrelayer');
var config_global = require('./config_base.js');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename,'.js');
logger.setLevel(config_global.logLevel);

function init(emitter, callback) {
    'use strict';
    emitter.on(MG.EVENT_NEWSTATE, function onNewEvent(data) {
        logger.debug('onNewEvent(data)', [data]);
        if (data.state === MG.STATE_ERROR || data.state === MG.STATE_COMPLETED) {
            do_http_callback(data.task, data.result || data.err, function onHttpCb(error, result) {
                logger.debug('onHttpCb(error, result) ', [error, result ]);
                if (error || result) {
                    var st = {
                        id:data.task.id,
                        state:MG.STATE_CALLBACK,
                        date:new Date(),
                        task:data.task,
                        err:error,
                        result:result
                    };
                    logger.info('onHttpCb - st', st) ;
                    emitter.emit(MG.EVENT_NEWSTATE, st);
                }
                if(error) {
                    logger.warning('onNewEvent', error);
                    var errev = {
                        id:data.task.id,
                        date: new Date(),
                        cb_err: error
                    };
                    emitter.emit(MG.EVENT_ERR, errev);
                }
            });
        }
    });
}

function do_http_callback(task, resp_obj, callback) {
    'use strict';
    logger.debug('do_http_callback(task, resp_obj, callback)', [task, resp_obj, callback]);
    var callback_host = task.headers[MG.HEAD_RELAYER_HTTPCALLBACK];
    var cb_res;
    if (callback_host) {
        var callback_options = url.parse(callback_host);
        callback_options.method = 'POST';
        var callback_req = http.request(callback_options, function (callback_res) {
            //check callback_res status (modify state) Not interested in body
            cb_res = {callback_status:callback_res.statusCode};
            if (task.headers[MG.HEAD_RELAYER_PERSISTENCE]) {
            db.update(task.id, cb_res, function onUpdated(err) {
                if (err) {
                    logger.warning('onUpdated', err);
                }
                if (callback) {
                    callback(err, cb_res);
                }
            });
            }
            else {
                if (callback) {
                    callback(null, cb_res);
                }
            }
        });


        callback_req.on('error', function onReqError(err) {
            //error in request
            if(err) {
                logger.warning('onReqError', err);
            }
            var cb_st = { error: err.code+'('+ err.syscall+')'};
            //store iff persistence policy
            if (task.headers[MG.HEAD_RELAYER_PERSISTENCE]) {
            db.update(task.id, cb_st, function onUpdated(err) {
                if (err) {
                    logger.warning('onUpdated', err);
                }
                if (callback) {
                    callback(cb_st, null);
                }
            });
            }
            else {
                if (callback) {
                    callback(cb_st, null);
                }
            }
        });
        var str_resp_obj = JSON.stringify(resp_obj);
        callback_req.write(str_resp_obj);
        callback_req.end();
    } else {
        if (callback) {
            callback(null);
        }
    }
}

exports.init = init;
