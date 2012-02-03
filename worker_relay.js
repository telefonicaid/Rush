var redis = require("redis");
var http = require("http");
var MG = require("./my_globals").C;
var rcli = redis.createClient(redis.DEFAULT_PORT, '10.95.8.182');

function do_job(task) {
    var target_host = task.headers[MG.HEAD_RELAYER_HOST];
    if (!target_host) {
        console.log("Not target host");
    }
    else {
        task.headers["host"] = target_host;
        var hostport = target_host.split(":");
        var options = {
            hostname:hostport[0],
            port:hostport[1] || "80",
            method:task.method,
            path:task.url,
            headers:task.headers
        };
        console.log("Haciendo peticion");
        console.dir(options);
        req = http.request(options, function (rly_res) {
            get_response(rly_res, task, function (task, resp_obj) {
                console.log("resp from target");
                console.log(resp_obj);
                //PERSISTENCE
                if (task.headers[MG.HEAD_RELAYER_PERSISTENCE]) {
                    set_redis(task, resp_obj, task.headers[MG.HEAD_RELAYER_PERSISTENCE]);
                }
                else {
                }
            });
        });
        req.on('error', function (e) {
            console.log('problem with request: ' + e);
            handle_error(e, task);

        });
        req.end();
    }
}



function get_response(resp, task, callback) {
    var data = "";
    resp.on('data', function (chunk) {
        data += chunk;
    });
    resp.on('end', function (chunk) {
        if (chunk) {
            data += chunk;
        }
        var headers_str = JSON.stringify(resp.headers);
        console.log("resp in get_response");
        console.dir(resp);
        var resp_obj = {statusCode:resp.statusCode, headers:headers_str, body:data };

        if (callback) {
            callback(task, resp_obj);
        }
    });
}


function set_redis(task, resp_obj, type) {
    //TODO refactorize
    //remove from response what is not needed
    //TODO CASE SENTSITIVE
    type = type.toUpperCase();

    if (type==='STATUS'){
        delete resp_obj.body;
        delete resp_obj.headers;
    }
    else if (type=='HEADER'){
        delete resp_obj.body;

    }
    else if (type=='BODY'){
       //nothing to do?
    }
    else {
        //Error
        console.log(type+" is not a valid value for "+ MG.HEAD_RELAYER_PERSISTENCE);
        return;
    }

    rcli.hmset("wrH:" + task.id, resp_obj, function (err, red_res) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        console.log(red_res);
                    }
                });
}


function handle_error(error, task, callback) {
    if(task.headers[MG.HEAD_RELAYER_RETRY])
        retry(task, callback);
}

function retry(task, callback) {
    var retry_list =task.headers[MG.HEAD_RELAYER_RETRY];
    var time = -1;

    if(retry_list) {
        retry_a = retry_list.split(",");
        if(retry_a.length>0) {
            time = parseInt(retry_a.shift(),10);
            if (retry_a.length >0) {
                // there is retry times still
                task.headers[MG.HEAD_RELAYER_RETRY] = retry_a.join(",");
            }
            else {
                delete task.headers[MG.HEAD_RELAYER_RETRY];
            }
            if (time > 0) {
                setTimeout(function() {
                        do_job(task);
                    }, time);
            }
        }
    }
    if(callback) callback();
}

exports.do_job = do_job;
