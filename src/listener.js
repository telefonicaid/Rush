//Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U
//
//This file is part of RUSH.
//
//  RUSH is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//  RUSH is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
//
//  You should have received a copy of the GNU Affero General Public License along with RUSH
//  . If not, seehttp://www.gnu.org/licenses/.
//
//For those usages not covered by the GNU Affero General Public License please contact with::dtc_support@tid.es

var config = require('./config_base.js');
var path = require('path');
var log = require('PDITCLogger');
log.setConfig(config.listener.logger);
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');


var http = require('http');
var url = require('url');
var uuid = require('node-uuid');
var router = require('./service_router');
var store = require('./task_queue');

var emitter = require('./emitter_module').get();
var G = require('./my_globals').C;

var dbrelayer = require('./dbrelayer');

var async = require("async");
var evModules = config.listener.evModules;
var evInitArray = evModules.map(function (x) {
    'use strict';
    return require(x.module).init(emitter, x.config);
});

logger.info('Node version:', process.versions.node);
logger.info('V8 version:', process.versions.v8);
logger.info('Current directory: ' , process.cwd());
logger.info('RUSH_DIR_PREFIX: ' , process.env.RUSH_DIR_PREFIX);

async.parallel(evInitArray,
    function onSubscribed(err, results) {
        'use strict';
        if(err){
            logger.error('error subscribing event listener', err);
            var errx = new Error(['error subscribing event listener', err]);
            errx.fatal = true;
        }
        else {
            startListener();
        }
    });



process.on('uncaughtException', function onUncaughtException(err) {
    'use strict';
    logger.error('onUncaughtException', err);
    if (err && err.fatal) {
        setTimeout(function() {process.exit();}, 1000);
        process.stdout.end();
    }
});





function startListener() {
    'use strict';

    http.createServer(function serveReq(req, res) {

    var data = '', parsedUrl, retrievePath = 'response', pathComponents, responseId, responseJson, reqLog = {};

    reqLog.start = Date.now();
    reqLog.url = req.url;
    reqLog.method = req.method;
    reqLog.remoteAddress = req.connection.remoteAddress;
    reqLog.headers = {};
    reqLog.headers[G.HEAD_RELAYER_HOST] = req.headers[G.HEAD_RELAYER_HOST];
    reqLog.headers[G.HEAD_RELAYER_RETRY] = req.headers[G.HEAD_RELAYER_RETRY];
    reqLog.headers[G.HEAD_RELAYER_HTTPCALLBACK] =
        req.headers[G.HEAD_RELAYER_HTTPCALLBACK];
    reqLog.headers[G.HEAD_RELAYER_PERSISTENCE] =
        req.headers[G.HEAD_RELAYER_PERSISTENCE];
    reqLog.headers[G.HEAD_RELAYER_TOPIC] = req.headers[G.HEAD_RELAYER_TOPIC];
    reqLog.headers['content-type'] = req.headers['content-type'];

    parsedUrl = url.parse(req.url);

    req.on('data', function onReqData(chunk) {
        data += chunk;
    });

    req.on('end', function onReqEnd() {
        if (parsedUrl.pathname === '/') {
            assignRequest(req, data, function writeRes(result) {
                res.writeHead(result.statusCode);
                res.end(result.data);
                reqLog.responseTime = Date.now() - reqLog.start;
                reqLog.statusCode = result.statusCode;
                reqLog.bodyLength = data.length;
                reqLog.id = result.data;
                delete reqLog.start;
                logger.info('request', reqLog);
            });
        } else {
            pathComponents = parsedUrl.pathname.split('/');
            var flatted = ['headers'];
            
            if (pathComponents.length === 3 && pathComponents[1] === retrievePath) {
                responseId = pathComponents[2];

                dbrelayer.getData(responseId, function (err, data) {

                    if (err) {
                        responseJson = JSON.stringify(err);
                    } else {
                        for (var i = 0; i < flatted.length; i++) {
                            try {
                                data[flatted[i]] = JSON.parse(data[flatted[i]]);
                            }
                            catch (e) {
                            }
                        }
                        responseJson = JSON.stringify(data);
                    }
                    res.setHeader('content-type','application/json; charset=utf-8');

                    var buf = new Buffer(responseJson,'utf-8')
                    res.setHeader('content-length',buf.length);
                    res.end(buf);
                });

            } else {
                res.writeHead(400);
                res.end('bad format: ' + parsedUrl.pathname);
                reqLog.responseTime = reqLog.responseTime = Date.now() - reqLog.start;
                reqLog.statusCode = 400;
                reqLog.bodyLength = data.length;
                logger.warning('bad format', reqLog);
            }
        }
    });
}).listen(config.listener.port);
}


function assignRequest(request, data, callback) {
    'use strict';

    var id = uuid.v1();

    var simpleReq = {
        id:id,
        method:request.method,
        httpVersion:request.httpVersion,
        url:request.url,
        headers:request.headers,
        body:data };

    var response = {};


    router.route(simpleReq, processTask);

    function processTask(err, routeObj) {
        if (!err) {

            store.put(routeObj.service, routeObj.task, function onWrittenReq(error) {
                var st;
                if (error) {
                    logger.warning('onWrittenReq', error);
                    response.statusCode=500;
                    response.data = error.toString();
                    //EMIT ERROR
                    var errev = {
                        id:routeObj.task.id,
                        topic:routeObj.task.headers[G.HEAD_RELAYER_TOPIC],
                        queueId:routeObj.service,
                        err:error,
                        date:new Date()
                    };
                    emitter.emit(G.EVENT_ERR, errev);
                    //EMIT STATE ERROR
                    st = {
                        id:routeObj.task.id,
                        topic:routeObj.task.headers[G.HEAD_RELAYER_TOPIC],
                        state:G.STATE_ERROR,
                        date:new Date(),
                        task:routeObj.task
                    };
                    emitter.emit(G.EVENT_NEWSTATE, st);
                } else {
                    response.statusCode = 200;
                    response.data = JSON.stringify({id: id, ok:true});

                    //EMIT STATE PENDING
                    st = {
                        id:routeObj.task.id,
                        topic:routeObj.task.headers[G.HEAD_RELAYER_TOPIC],
                        state:G.STATE_PENDING,
                        date:new Date(),
                        task:routeObj.task
                    };
                    emitter.emit(G.EVENT_NEWSTATE, st);
                }
                callback(response);
            });
        } else {
            response.statusCode = 400;
            response.data = JSON.stringify({ok: false, errors: err.message});
            logger.info('response', response);
            callback(response);
        }
    }
}


