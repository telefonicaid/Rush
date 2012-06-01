//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

var http = require('http');
var MG = require('./my_globals').C;
var url = require('url');

var path = require('path');
var log = require('./logger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename,'.js');

function do_job(task, callback) {
    "use strict";
    var target_host = task.headers[MG.HEAD_RELAYER_HOST],
        req;
    if (!target_host) {
        console.log("Not target host");
    } else {
        var options = url.parse(target_host);
        task.headers.host = options.host;
        options.headers = task.headers;
        options.method = task.method;
        req = http.request(options, function (rly_res) {
            if (Math.floor(rly_res.statusCode / 100) !== 5) {
                //if no 5XX ERROR
                get_response(rly_res, task, function (task, resp_obj) {
                    //PERSISTENCE
                                    if (callback) {
                                        callback(null, resp_obj);
                                    }
                                });
            } else {
                get_response(rly_res, task, function (task, resp_obj) {
                    var e = {resultOk:true, statusCode:rly_res.statusCode, headers:rly_res.headers, body:resp_obj.body };
                    handle_request_error(task, e, callback);
                });

            }
        });
        req.on('error', function (e) {
            e.resultOk = false;

            handle_request_error(task, {resultOk: false, error:e.code+'('+ e.syscall+')'}, callback);
        });

        if (options.method === 'POST' || options.method === 'PUT') {
            //write body
            req.write(task.body);
        }
        req.end(); //?? sure HERE?
    }
}

function handle_request_error(task, e, callback) {
    "use strict";
    console.log('problem with relayed request: ' + e.message);
    do_retry(task, e, callback);

}
function get_response(resp, task, callback) {
    "use strict";
    var data = "";
    resp.on('data', function (chunk) {
        data += chunk;
    });
    resp.on('end', function (chunk) {
        if (chunk) {
            if (chunk) {
                data += chunk;
            } //avoid tail undefined
        }
        var resp_obj = {resultOk:true, statusCode:resp.statusCode, headers:resp.headers, body:data};
        if (callback) {
            callback(task, resp_obj);
        }
    });
}


function do_retry(task, error, callback) {
    "use strict";
    var retry_list = task.headers[MG.HEAD_RELAYER_RETRY];
    var time = -1;
    if (retry_list) {
        var retry_a = retry_list.split(",");
        if (retry_a.length > 0) {
            time = parseInt(retry_a.shift(), 10);
            if (retry_a.length > 0) {
                // there is retry times still
                task.headers[MG.HEAD_RELAYER_RETRY] = retry_a.join(",");
            } else {
                //Retry End with no success
                delete task.headers[MG.HEAD_RELAYER_RETRY];
            }
            if (time > 0) {
                setTimeout(function () {
                    do_job(task, callback);
                }, time);
            }
        }
    } else {

        if (callback) {
            callback(error, null);
        }
    }
}
exports.do_job = do_job;
