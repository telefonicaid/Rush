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
        console.dir(options);
        req = http.request(options, function (rly_res) {
            get_response(rly_res, task, function (task, resp_obj) {

                //PERSISTENCE
                if (task.headers[MG.HEAD_RELAYER_PERSISTENCE]) {
                    set_redis(task, resp_obj, task.headers[MG.HEAD_RELAYER_PERSISTENCE]);
                }
                else {
                }
            });
        });
        req.on('error', function (e) {
            console.log('problem with request: ' + e.message);
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

exports.do_job = do_job;
