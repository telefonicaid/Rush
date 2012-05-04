//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

var http = require('http');
var url = require('url');
var uuid = require('node-uuid');
var router = require('./service_router');
var store = require('./task_queue.js');
var logger = require('./logger.js');
var emitter = require('./emitter_module.js').get();
var G = require('./my_globals').C;
var dbrelayer = require('./dbrelayer.js');



var ev_lsnr = require('./ev_lsnr');
ev_lsnr.init(emitter);

var server = http.createServer(
    function(req, res) {
      'use strict';

      var data = '',
      parsedUrl,
      retrievePath = 'response',
      pathComponents,
      response_id,
      response_json;

      parsedUrl = url.parse(req.url);

      req.on('data', function(chunk) {
        data += chunk;
      });

      req.on('end', function(chunk) {
        if (chunk) {
          data += chunk;
        }
        logger.info('request received');

        if(parsedUrl.pathname === '/') {
          assign_request(req, data, function write_res(result) {
            logger.info('writing response to client');
            res.writeHead(result.statusCode);
            res.end(result.data);
          });
        }
        else {
          pathComponents = parsedUrl.pathname.split('/');

          if (pathComponents.length === 3 && pathComponents[1] === retrievePath) {
            response_id = pathComponents[2];

            dbrelayer.get_data(response_id, function(err, data) {
              if (err) {
                response_json = JSON.stringify(err);
              }
              else {
                response_json = JSON.stringify(data);
              }
              res.end(response_json);
            });

          }
          else {
            res.writeHead(400);
            res.end('bad format: '+parsedUrl.pathname);
          }
        }
      });
    }).listen(8030);


function assign_request(request, data, callback) {
    'use strict';
    var id = uuid.v1();

    var simple_req = {
        id:id,
        method:request.method,
        httpVersion:request.httpVersion,
        url:request.url,
        headers:request.headers,
        body:data };

    var response = {};

    var target = router.route(simple_req);

    logger.info('target ', target);

    if (target.ok) {
        logger.info('target ok!');
        store.put(target.service, simple_req, function written_req(error) {
                if (error) {
                    logger.info('error put');
                    response.statusCode(500);
                    response.data = error.toString();
                    logger.info('response', response);
                    //EMIT ERROR
                    var errev = {
                        queueId:target.service,
                        err:error,
                        date:new Date()
                    };
                    emitter.emit(G.EVENT_ERR, errev);
                    //EMIT STATE ERROR
                    var st = {
                        id:simple_req.id,
                        state:G.STATE_ERROR,
                        date:new Date(),
                        task:simple_req
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
                        date:new Date(),
                        task:simple_req
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
        logger.info('response', response);
        callback(response);
    }
}


