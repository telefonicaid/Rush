  //
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

var http = require('http');
var uuid = require('node-uuid');
var router = require('./service_router');
var store = require('./task_queue.js');
var logger = require('./logger.js');
var emitter = require('./emitter_module.js').get();
var G = require('./my_globals').C;

var ev_lsnr = require('./ev_lsnr');
ev_lsnr.init(emitter);

var n = 0;


var server = http.createServer(
    function (req, res) {

        var data = '';

        req.on('data', function (chunk) {
            data += chunk;
        });

        req.on('end', function (chunk) {
            if (chunk) {
                data += chunk;
            }

            logger.info('request received');
            assign_request(req, data, function write_res(result) {
                logger.info('writing response to client');
                res.writeHead(result.statusCode);
                res.end(result.data);
            });
        });
    }).listen(8030);


function assign_request(request, data, callback) {

        var id = uuid.v1();

        var simple_req = {
                id:id,
                method: request.method,
                httpVersion: request.httpVersion,
                url: request.url,
                headers:request.headers,
                body:data };

        var response = {};

        var target = router.route(simple_req);

        logger.info('target ',target);

        if (target.ok) {
            logger.info('target ok!');
            store.put(target.service, simple_req, function written_req(error) {
                    if(error) {
                        logger.info('error put');
                        response.statusCode(500);
                        response.data = error.toString();
                        logger.info('response',response);
                        //EMIT ERROR
                        var errev = {
                            err:err,
                            state:G.STATE_PENDING,
                            date: Date(),
                            msg:'error provisioning task',
                            consumer_id: ''
                        };
                        emitter.emit(G.EVENT_ERR, errev);
                        //EMIT STATE ERROR
                        var st = {
                            id:simple_req.id,
                            state:G.STATE_ERROR,
                            date: Date(),
                            task: simple_req,
                            consumer_id: '',
                            msg:'error provisioning task'
                        };
                        emitter.emit(G.EVENT_NEWSTATE, st);
                    }
                    else {
                        logger.info('ok put');
                        response.statusCode = 200;
                        response.data = id;
                        logger.info('response', response);
                        //EMIT STATE PENDING
                        var st = {
                            id:simple_req.id,
                            state:G.STATE_PENDING,
                            date: Date(),
                            task: simple_req,
                            consumer_id: ''
                        };
                        emitter.emit(G.EVENT_NEWSTATE, st);
                    }
                    callback(response);
                }
            );
        }
        else {
            response.statusCode = 404;
            response.data = target.message;
            logger.info('response',response);
            callback(response);
        }
}


