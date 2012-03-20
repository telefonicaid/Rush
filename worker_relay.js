var http = require('http');
var MG = require('./my_globals').C;
var url = require('url');
var db = require('./dbrelayer');
function do_job(task, callback) {
    var target_host = task.headers[MG.HEAD_RELAYER_HOST];
    if (!target_host) {
        console.log("Not target host");
    }
    else {
        var options = url.parse(target_host);
        task.headers['host'] = options.host;
        options.headers = task.headers;
        options.method = task.method;
        req = http.request(options, function (rly_res) {
                if (Math.floor(rly_res.statusCode / 100) != 5) {
                    //if no 5XX ERROR

                    get_response(rly_res, task, function (task, resp_obj) {
                        //PERSISTENCE
                        do_persistence(task, resp_obj, task.headers[MG.HEAD_RELAYER_PERSISTENCE], function () {
                            //CALLBACK
                            do_http_callback(task, resp_obj, callback);
                        });
                    });
                }
                else {
                    handle_request_error(task, callback)({message:'Server error:' + rly_res.statusCode, statusCode:rly_res.statusCode, headers:rly_res.headers});
                }
            }
        );
        req.on('error', handle_request_error(task, callback));
        if (options.method == 'POST' || options.method == 'PUT') {
            //write body
            req.write(task.body);
        }
        req.end(); //?? sure HERE?
    }
}

function handle_request_error(task, callback) {
    return function (e) {
        console.log('problem with relayed request: ' + e.message);
        do_retry(task, e, callback);
    }
}
function get_response(resp, task, callback) {
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
        var resp_obj = {statusCode:resp.statusCode, headers:resp.headers, body:data, state:'relay_response'};
        if (callback) {
            callback(task, resp_obj);
        }
    });
}
function set_object(task, resp_obj, type, callback) {
    //remove from response what is not needed
    var set_obj = {};
    type = type.toUpperCase();
    //todo
    if (type === 'STATUS') {
        set_obj.statusCode = resp_obj.statusCode;
    }
    else if (type == 'HEADER') {
        set_obj.statusCode = resp_obj.statusCode;
        set_obj.headers = resp_obj.headers;
    }
    else if (type == 'BODY') {
        set_obj.statusCode = resp_obj.statusCode;
        set_obj.headers = resp_obj.headers;
        set_obj.body = resp_obj.body;
    }
    else if (type == 'ERROR') {
        set_obj = resp_obj;
    }
    else {
        //Error
        console.log(type + " is not a valid value for " + MG.HEAD_RELAYER_PERSISTENCE);
        callback && callback();
    }
    db.update(task.id, set_obj, function (err, red_res) {
        if (err) {
            console.log(err);
        }
        else {

        }
        callback && callback();
    });
}
function do_persistence(task, resp_obj, type, callback) {
    if (type) {
        set_object(task, resp_obj, type, callback);
    }
    else if (callback) callback();
}
function do_http_callback(task, resp_obj, callback) {
    var callback_host = task.headers[MG.HEAD_RELAYER_HTTPCALLBACK];
    var db_err;
    if (callback_host) {
        var callback_options = url.parse(callback_host);
        callback_options.method = 'POST';
        var callback_req = http.request(callback_options, function (callback_res) {
                //check callback_res status (modify state) Not interested in body
                db_err = {callback_status:callback_res.statusCode, callback_details:'callback sent OK'};
                db.update(task.id, db_err, function (err) {
                    if (err) {
                        console.log("BD Error setting callback status:" + err);
                    }
                    if (callback) callback();
                });
            }
        );
        callback_req.on('error', function (err) {
            //error in request
            var str_err = JSON.stringify(err);  // Too much information?????
            db_err = {callback_status:'error', callback_details:str_err};
            //store
            db.update(task.id, db_err, function (dberr) {
                if (dberr) {
                    console.log("BD Error setting callback ERROR:" + dberr);
                }
                if (callback) callback();
            });
        });
        var str_resp_obj = JSON.stringify(resp_obj);
        callback_req.write(str_resp_obj);
        callback_req.end();
    }
    else {
        if (callback) callback();
    }
}
function do_retry(task, error, callback) {
    var retry_list = task.headers[MG.HEAD_RELAYER_RETRY];
    var time = -1;
    if (retry_list) {
        retry_a = retry_list.split(",");
        if (retry_a.length > 0) {
            time = parseInt(retry_a.shift(), 10);
            if (retry_a.length > 0) {
                // there is retry times still
                task.headers[MG.HEAD_RELAYER_RETRY] = retry_a.join(",");
            }
            else {
                //Retry End with no success
                delete task.headers[MG.HEAD_RELAYER_RETRY];
            }
            if (time > 0) {
                setTimeout(function () {
                    do_job(task, callback);
                }, time);
            }
        }
    }
    else {
        //no more attempts (or no retry policy)
        //error persistence
        do_persistence(task, error, 'ERROR', function (err) {
            //CALLBACK
            do_http_callback(task, e, callback);
        });
    }
}
exports.do_job = do_job;
