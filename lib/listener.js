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

var config = require('./configBase.js');
var path = require('path');
var log = require('PDITCLogger');
log.setConfig(config.listener.logger);
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');


var http = require('http');
var https = require('https');
var express = require('express');
var fs = require('fs');
var url = require('url');
var uuid = require('node-uuid');
var apiErrorsParser = require('./unicaErrorsParser.js');
var router = require('./serviceRouter');
var store = require('./taskQueue');

var emitter = require('./emitterModule').get();
var G = require('./myGlobals').C;

var dbrelayer = require('./dbRelayer');

var async = require('async');
var evModules = config.listener.evModules;
evModules = evModules.filter(function (x) {
  return x;
});  //Remove empty elements
var evInitArray = evModules.map(function (x) {
  'use strict';
  return require(x.module).init(emitter, x.config);
});

var app;

logger.info({ opType: 'START UP',  msg: 'Node version: '}, process.versions.node);
logger.info({ opType: 'START UP',  msg: 'V8 version: '},  process.versions.v8);
logger.info({ opType: 'START UP',  msg: 'Current directory: '}, process.cwd());
logger.info({ opType: 'START UP',  msg: 'RUSH_DIR_PREFIX: '}, process.env.RUSH_DIR_PREFIX);

async.parallel(evInitArray,
    function onSubscribed(err, results) {
      'use strict';
      if (err) {
        logger.error('error subscribing event listener', err);
        var errx = new Error(['error subscribing event listener', err]);
        errx.fatal = true;
      }
    });


function start(done) {
  'use strict';
  var err = null;

  function relayReq(req, res) {

    var data = '', reqLog = {};

    reqLog.start = Date.now();
    reqLog.url = req.url;
    reqLog.method = req.method;
    reqLog.remoteAddress = req.connection.remoteAddress;
    reqLog.headers = {};
    reqLog.headers[G.HEAD_RELAYER_HOST] = req.headers[G.HEAD_RELAYER_HOST];
    reqLog.headers[G.HEAD_RELAYER_PROXY] = req.headers[G.HEAD_RELAYER_PROXY];
    reqLog.headers[G.HEAD_RELAYER_RETRY] = req.headers[G.HEAD_RELAYER_RETRY];
    reqLog.headers[G.HEAD_RELAYER_HTTPCALLBACK] = req.headers[G.HEAD_RELAYER_HTTPCALLBACK];
    reqLog.headers[G.HEAD_RELAYER_PERSISTENCE] = req.headers[G.HEAD_RELAYER_PERSISTENCE];
    reqLog.headers[G.HEAD_RELAYER_TOPIC] = req.headers[G.HEAD_RELAYER_TOPIC];
    reqLog.headers[G.HEAD_RELAYER_ENCODING] = req.headers[G.HEAD_RELAYER_ENCODING];
    reqLog.headers['content-type'] = req.headers['content-type'];

    req.on('data', function onReqData(chunk) {
      data += chunk;
    });

    req.on('end', function onReqEnd() {
      req.headers["X-Forwarded-For"] = req.connection.remoteAddress;
      assignRequest(req, data, function writeRes(result) {

        if (result.data.id) {
          res.header('Location', '/response/' + result.data.id)
        }
        //Send request
        res.send(result.statusCode, result.data);

        //Logger
        reqLog.responseTime = Date.now() - reqLog.start;
        reqLog.statusCode = result.statusCode;
        reqLog.bodyLength = data.length;
        reqLog.id = result.data;
        delete reqLog.start;

        var logMsg = { opType: 'RELAY REQUEST' };

        if (result.data.id) {
          logMsg.traceID = result.data.id;
        }

        logger.info(logMsg, reqLog);
      });
    });
  }

  function retrieveResponse(req, res) {

    var reqLog = {};

    reqLog.url = req.url;
    reqLog.method = req.method;
    reqLog.remoteAddress = req.connection.remoteAddress;

    req.on('end', function () {

      var flatted = ['headers', 'exception'], response,
          responseId = req.param('id_response');

      dbrelayer.getData(responseId, function (err, data) {

        if (err) {
          var error = { type: G.SERVER_ERROR, message: err.toString() };
          response = apiErrorsParser.parseError(error);
        } else {

          if (!data) {
            var error = { type: G.UNKNOWN_RESOURCE, resourceID: responseId };
            response = apiErrorsParser.parseError(error);
          } else {
            for (var i = 0; i < flatted.length; i++) {
              try {
                data[flatted[i]] = JSON.parse(data[flatted[i]]);
              }
              catch (e) {
              }
            }

            response = { statusCode: 200, data: data };
          }
        }

        res.send(response.statusCode, response.data);

        reqLog.statusCode = response.statusCode;
        reqLog.data = response.data;
        logger.info({opType: 'RETRIEVE RESPONSE' }, reqLog);
      });
    });

    req.resume();
  }

  function responsePath(req, res) {
    //If user want to retrieve information about an ID,
    //X-Relayer-Host head cannot be included in the request.
    //If this header is included, request will be relayed
    if (req.headers[G.HEAD_RELAYER_HOST]) {
      relayReq(req, res);
    } else {
      retrieveResponse(req, res);
    }
  }

  app = express();
  app.get('/response/:id_response', responsePath);
  app.all('/*', relayReq);

  //Start unsecure Server
  app.unsecureServer = http.createServer(app).listen(config.listener.unsecurePort);
  logger.info({ opType: 'START UP',  msg: 'Rush (UNSEC) listening on '}, config.listener.unsecurePort);

  //Start secure Server
  if (config.listener.enableSecure) {

    var secureOptions = {},
        dirModule = path.dirname(module.filename);

    if (!config.listener.crtPath) {
      secureOptions = {
        key: path.resolve(dirModule, '../utils/server.key'),
        cert: path.resolve(dirModule, '../utils/server.crt')
      };
    } else {
      secureOptions = {
        key: path.resolve(config.listener.crtPath, 'server.key'),
        cert: path.resolve(config.listener.crtPath, 'server.crt')
      };
    }

    /*checks whether the cert files exist or not
     and starts the appSec server*/

    if (fs.existsSync(secureOptions.key) &&
        fs.existsSync(secureOptions.cert) &&
        fs.statSync(secureOptions.key).isFile() &&
        fs.statSync(secureOptions.cert).isFile()) {

      var options = {
        key: fs.readFileSync(secureOptions.key),
        cert: fs.readFileSync(secureOptions.cert)
      };

      app.secureServer = https.createServer(options, app).listen(config.listener.securePort);
      logger.info({ opType: 'START UP',  msg: 'Rush (SEC) listening on ' }, config.listener.securePort);

    } else {
      logger.warning({ opType: 'START UP',  msg: 'Certs Not Found'}, secureOptions);
      err = new Error('No valid certificates were found in the given path');
    }
  }

  if (!err) {
    store.openConnections(done);
  } else {
    if (done) {
      done(err, null);
    } else {
      throw err;
    }
  }

}

function stop(done) {

  if (app.unsecureServer) {
    app.unsecureServer.close(function() {
      if (app.secureServer) {
        app.secureServer.close(function() {
          app.secureServer = null;
          app.unsecureServer = null;
          store.closeConnections(done);
        })
      } else {
        store.closeConnections(done);
      }
    });
  } else {
    store.closeConnections(done);
  }
}


function assignRequest(request, data, callback) {
  'use strict';

  var id = uuid.v1();

  var simpleReq = {
    id: id,
    method: request.method,
    httpVersion: request.httpVersion,
    path: request.url,
    headers: request.headers,
    protocol: request.protocol,
    body: data };

  var response = {};


  router.route(simpleReq, processTask);

  function processTask(err, routeObj) {
    if (!err) {

      store.put(routeObj.service, routeObj.task, function onWrittenReq(error) {
        var st;
        if (error) {
          logger.warning('Storage Error', error);

          var error = { type: G.SERVER_ERROR, message: error.toString() };
          response = apiErrorsParser.parseError(error);

          //EMIT ERROR
          var errev = {
            id: routeObj.task.id,
            topic: routeObj.task.headers[G.HEAD_RELAYER_TOPIC],
            queueId: routeObj.service,
            err: error,
            date: new Date()
          };
          emitter.emit(G.EVENT_ERR, errev);
          //EMIT STATE ERROR
          st = {
            id: routeObj.task.id,
            topic: routeObj.task.headers[G.HEAD_RELAYER_TOPIC],
            state: G.STATE_ERROR,
            date: new Date(),
            task: routeObj.task
          };
          emitter.emit(G.EVENT_NEWSTATE, st);
        } else {
          response.statusCode = 201;
          response.data = {id: id};

          //EMIT STATE PENDING
          st = {
            id: routeObj.task.id,
            topic: routeObj.task.headers[G.HEAD_RELAYER_TOPIC],
            state: G.STATE_PENDING,
            date: new Date(),
            task: routeObj.task
          };
          emitter.emit(G.EVENT_NEWSTATE, st);
        }
        callback(response);
      });
    } else {
      callback(apiErrorsParser.parseErrors(err));
    }
  }
}

exports.start = start;
exports.stop = stop;

