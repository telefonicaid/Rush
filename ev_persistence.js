var MG = require('./my_globals').C;
var db = require('./dbrelayer');

function init(emitter, callback) {
    "use strict";
    emitter.on(MG.EVENT_NEWSTATE, function new_event(data) {
        if (data.state === MG.STATE_ERROR || data.state === MG.STATE_COMPLETED) {
            do_persistence(data.task, data.result, function (error, result) {
                if(error||result){
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

    if (type === 'STATUS') {
        set_obj.statusCode = resp_obj.statusCode;
    }
    else if (type === 'HEADER') {
        set_obj.statusCode = resp_obj.statusCode;
        set_obj.headers = resp_obj.headers;
    }
    else if (type === 'BODY') {
        set_obj.statusCode = resp_obj.statusCode;
        set_obj.headers = resp_obj.headers;
        set_obj.body = resp_obj.body;
    }
    else if (type === 'ERROR') {
        set_obj = resp_obj;
        set_obj.resultOk = false;
    }

    db.update(task.id, set_obj, function (err) {
      if (!err) {set_obj.resultOk = true;}
      else{ set_obj.resultOk=false;}

      if (callback) {
            callback(err, set_obj);
        }
    });
}
