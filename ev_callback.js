var http = require('http');
var MG = require('./my_globals').C;
var url = require('url');


function init(emitter, callback) {
    "use strict";
    emitter.on(MG.EVENT_NEWSTATE, function new_event(data) {
        if (data.state === MG.STATE_ERROR || data.state === MG.STATE_COMPLETED) {
            do_http_callback(data.task, data.result, function (error, result) {
                var st = {
                    id:data.task.id,
                    state:MG.CALLBACK_RESULT,
                    date:new Date(),
                    task:data.task,
                    err:error,
                    result:result
                };
                emitter.emit(MG.EVENT_NEWSTATE, st);
            });
        }
    });
}

function do_http_callback(task, resp_obj, callback) {
    "use strict";
    var callback_host = task.headers[MG.HEAD_RELAYER_HTTPCALLBACK];
    var cb_res;
    if (callback_host) {
        var callback_options = url.parse(callback_host);
        callback_options.method = 'POST';
        var callback_req = http.request(callback_options, function (callback_res) {
            //check callback_res status (modify state) Not interested in body
            cb_res = {callback_status:callback_res.statusCode};

                if (callback) {
                    callback(null, cb_res);
                }
        });


        callback_req.on('error', function (err) {
            //error in request
            var str_err = JSON.stringify(err);  // Too much information?????
            var cb_st = {callback_status:str_err};
            //store iff persistence policy

                if (callback) {
                    callback(cb_st, null);
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
