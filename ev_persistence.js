var MG = require('./my_globals').C;
var db = require('./dbrelayer');

function init(emitter, callback) {
    "use strict";
    emitter.on(MG.EVENT_NEWSTATE, function new_event(data) {


        if (data.state === MG.STATE_ERROR ||data.state === MG.STATE_COMPLETED) {
            console.log("\n\n\nDATA (persistence):\n");
            console.dir(data);
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
    "use strict";

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
                console.log(err_msg);
                callback(err_msg);
            }
        }
    }
}

function set_object(task, resp_obj, type, callback) {
    "use strict";
    //remove from response what is not needed
    var err_msg,
        set_obj = {};
    type = type.toUpperCase();
    set_obj.resultOk = true;

    if (type === 'ERROR') {
        set_obj.resultOk = false;
        set_obj.error = resp_obj.errno;
    }
    else {
        set_obj.resultOk = true;
        switch (type) {
            case 'BODY':
                set_obj.body = resp_obj.body;
            /* fall-through */
            case  'HEADER':
                set_obj.headers = resp_obj.headers;
            /* fall-through */
            case  'STATUS':
                set_obj.statusCode = resp_obj.statusCode;
                break;
        }
    }

    db.update(task.id, set_obj, function (err) {

      if (callback) {
            callback(err, set_obj);
        }
    });
}

exports.init = init;