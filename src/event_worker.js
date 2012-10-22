//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

var http = require('http');
var https = require('https');

var MG = require('./my_globals').C;
var url = require('url');
var config_global = require('./config_base.js');
var config = config_global.consumer;

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename,'.js');

http.globalAgent.max_sockets = config.max_sockets;
https.globalAgent.max_sockets = config.max_sockets;

function urlErrors(pUrl) {
    "use strict";
    var parsedUrl;
    if (pUrl) {
        parsedUrl = url.parse(pUrl);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return ('Invalid protocol ' + pUrl );
        }
        else if (!parsedUrl.hostname){
          return ('Hostname expected. Empty host after protocol');
        }
    }

    return null;
}
function createTask(simpleRequest, callback) {
    "use strict";
    
    //Check required headers
    if (!simpleRequest.headers[MG.HEAD_RELAYER_HOST]) {
        callback ([MG.HEAD_RELAYER_HOST + ' is missing'], null);
    }
    else {
        var errorsHeaders = [];
        //check URLS
        errorsHeaders = [simpleRequest.headers[MG.HEAD_RELAYER_HTTPCALLBACK],
            simpleRequest.headers[MG.HEAD_RELAYER_HTTPCALLBACK_ERROR],
            simpleRequest.headers[MG.HEAD_RELAYER_HOST]
        ].map(urlErrors).filter(function(e) { return e!==null;});
        
        //check Retry header
        var retryStr = simpleRequest.headers[MG.HEAD_RELAYER_RETRY];
        if (retryStr) {
         var retrySplit = retryStr.split(',');
        if (!retrySplit.every(function(num){return isFinite(Number(num));})) {
            errorsHeaders.push('invalid retry value: '+ retryStr);
        }
        }
        //check Persistence Header
        var persistence = simpleRequest.headers[MG.HEAD_RELAYER_PERSISTENCE];
        if(persistence){
        if (persistence!=='BODY' && persistence !== 'STATUS' && persistence !== 'HEADER'){
            errorsHeaders.push('invalid persistence type: '+persistence);
        }
        }      
        if(errorsHeaders.length > 0) {
                 callback(errorsHeaders, null);
        }
        else {
            callback(null, simpleRequest);
        }
    }    
}

function doJob(task, callback) {
    'use strict';
    logger.debug('doJob(task, callback)', [task, callback]);

    var httpModule;
    
    var target_host = task.headers[MG.HEAD_RELAYER_HOST],
        req;
    if (!target_host) {
        logger.warning('doJob','No target host');
    } else {
        var options = url.parse(target_host);
        task.headers.host = options.host;

        if(options.protocol === 'https:'){
            httpModule = https;
        }
        else  { // assume plain http
            httpModule = http;
        }
        
        options.headers = delXrelayerHeaders(task.headers);
        options.method = task.method;
        if(config.agent !== undefined) {
            options.agent = config.agent;
        }

        req = httpModule.request(options, function (rly_res) {
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
                    var e = {id:task.id, resultOk:false, statusCode:rly_res.statusCode, headers:rly_res.headers, body:resp_obj.body };
                    handle_request_error(task, e, callback);
                });

            }
        });
        req.on('error', function (e) {
            e.resultOk = false;
            logger.warning('doJob',e);
            handle_request_error(task, {id:task.id, resultOk: false, error:e.code+'('+ e.syscall+')'}, callback);
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
    logger.debug('handle_request_error(task, e, callback)', [task, e, callback]);
    logger.warning('handle_request_error', e);
    do_retry(task, e, callback);

}
function get_response(resp, task, callback) {
    "use strict";
    logger.debug('get_response(resp, task, callback)', [resp, task, callback]);

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
        var resp_obj = {id: task.id, topic: task.headers[MG.HEAD_RELAYER_TOPIC], resultOk:true, statusCode:resp.statusCode, headers:resp.headers, body:data};
        if (callback) {
            callback(task, resp_obj);
        }
    });
}


function do_retry(task, error, callback) {
    "use strict";
    logger.debug('do_retry(task, error, callback)',[task, error, callback]);

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
                    doJob(task, callback);
                }, time);
            }
        }
    } else {

        if (callback) {
            callback(error, null);
        }
    }
}

function delXrelayerHeaders(headers) {
    "use strict";
    
    var cleanHeaders = {};
    for(var h in headers) {
        if (headers.hasOwnProperty(h)) {
            if(h.toLowerCase().indexOf('x-relayer')!==0) {
                cleanHeaders[h] = headers[h];
            }             
        }
    }
    return cleanHeaders;
}
exports.doJob = doJob;
exports.createTask = createTask;
