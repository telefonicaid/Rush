var MG = require('./my_globals').C;
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

        if (data.state === MG.STATE_ERROR ||data.state === MG.STATE_COMPLETED) {
            var type = data.state === MG.STATE_ERROR?'ERROR':data.task.headers[MG.HEAD_RELAYER_PERSISTENCE];
            do_persistence(data.task, data.result || data.err, type, function (error, result) {
                if (error || result) {
                    var st = {
                        id:data.task.id,
                        state:MG.STATE_PERSISTENCE,
                        date:new Date(),
                        task:data.task,
                        err:error,
                        result:result
                    };
                    emitter.emit(MG.EVENT_NEWSTATE, st);
                }
            });
        }
    });
}

function do_persistence(task, resp_obj, type, callback) {
    'use strict';
    logger.debug('do_persistence(task, resp_obj, type, callback)', [task, resp_obj, type, callback]);
    if (type === 'BODY' || type === 'STATUS' || type === 'HEADER' || type === 'ERROR') {
        set_object(task, resp_obj, type, callback);
    } else {
        if (!type && callback) {
            callback(null, null);
        } else {
            if (callback) {
                //Error
                var err_msg =
                    type + " is not a valid value for " + MG.HEAD_RELAYER_PERSISTENCE;
                logger.warning('do_persistence', err_msg);
                callback(err_msg);
            }
        }
    }
}

function set_object(task, resp_obj, type, callback) {
    'use strict';
    logger.debug('set_object(task, resp_obj, type, callback)', [task, resp_obj, type, callback] );

    //remove from response what is not needed
    var err_msg,
        set_obj = {};
    type = type.toUpperCase();

    set_obj = resp_obj;
    switch (type) {
        case 'STATUS':
            delete set_obj.headers;
        /* fall-through */
        case  'HEADER':
            delete set_obj.body;
            break;
    }

    db.update(task.id, set_obj, function onUpdated(err) {

        if(err) {
               logger.warning('onUpdated', err);
        }

        if (callback) {
            callback(err, set_obj);
        }
    });
}

exports.init = init;