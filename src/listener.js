//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//
var config = require('./config_base.js');
var path = require('path');
var log = require('PDITCLogger');
config.logger.File.filename = 'listener.log';
log.setConfig(config.logger);
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

var ev_lsnr = require('./ev_lsnr');
ev_lsnr.init(emitter);

var async = require("async");
var evModules = config.listener.evModules;
var evInitArray = evModules.map(function (x) {
    'use strict';
    return require(x).init(emitter);
});

async.parallel(evInitArray,
    function onSubscribed(err, results) {
        'use strict';
        logger.debug('onSubscribed(err, results)', [err, results]);
        if(err){
            console.log('error subscribing event listener', err);
            throw new Error(['error subscribing event listener', err]);
        }
        else {
            startListener();
        }
    });

function startListener() {
    'use strict';

    http.createServer(function serveReq(req, res) {

    var data = '', parsedUrl, retrievePath = 'response', pathComponents, response_id, response_json, reqLog = {};

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
            assign_request(req, data, function write_res(result) {
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
            logger.debug('pathComponents', pathComponents);

            if (pathComponents.length === 3 && pathComponents[1] === retrievePath) {
                response_id = pathComponents[2];

                dbrelayer.get_data(response_id, function (err, data) {
                    if (err) {
                        response_json = JSON.stringify(err);
                    } else {
                        response_json = JSON.stringify(data);
                    }
                    res.end(response_json);
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


function assign_request(request, data, callback) {
    'use strict';
    logger.debug('assign_request(request, data, callback)',
        [request, data, callback]);

    var id = uuid.v1();

    var simple_req = {
        id:id,
        method:request.method,
        httpVersion:request.httpVersion,
        url:request.url,
        headers:request.headers,
        body:data };

    var response = {};


    router.route(simple_req, processTask);

    function processTask(err, routeObj) {
        if (!err) {

            logger.debug('assign_request - target - task', routeObj);

            store.put(routeObj.service, routeObj.task, function onWrittenReq(error) {
                var st;
                if (error) {
                    logger.warning('onWrittenReq', error);
                    response.statusCode(500);
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
            response.statusCode = 404;
            response.data = JSON.stringify({ok: false, errors: err.message});
            logger.info('response', response);
            callback(response);
        }
    }
}


