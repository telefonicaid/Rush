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

        var tmp = target_host.split(":");

        var options = {
            hostname: tmp[0],
            port: tmp[1] || "80",
            method:task.method,
            path:task.url,
            headers:task.headers
        };

        console.dir(options);
        req = http.request(options, function (rly_res) {
            save_response(rly_res, task);
        });

        req.on('error', function (e) {
            console.log('problem with request: ' + e.message);
        });
        req.end();
    }

}

function save_response(resp, task) {

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


        rcli.hmset("wrH:" + task.id, resp_obj, function (err, red_res) {

            if (err) {
                console.log(err);
            }
            else {
                console.log(red_res);
            }
        });
    });
}

exports.do_job = do_job;
