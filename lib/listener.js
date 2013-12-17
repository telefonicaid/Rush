//Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U
//
//This file is part of RUSH.
//
//  RUSH is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public
//  License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later
//  version.
//  RUSH is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty
//  of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
//
//  You should have received a copy of the GNU Affero General Public License along with RUSH
//  . If not, seehttp://www.gnu.org/licenses/.
//
//For those usages not covered by the GNU Affero General Public License please contact with::dtc_support@tid.es

var config = require('./config.js');
var path = require('path');
var log = require('./logger/logger');
log.setConfig(config.logger);
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');
var monitoringProbe = require('./monitoringProbe');


var http = require('http');
var https = require('https');
var express = require('express');
var fs = require('fs');
var uuid = require('node-uuid');
var apiErrorsParser = require('./unicaErrorsParser.js');
var router = require('./serviceRouter');
var store = require('./taskQueue');

var emitter = require('./emitterModule').get();
var G = require('./myGlobals').C;

var dbrelayer = require('./dbRelayer');
var dbCluster = require('./dbCluster.js');

var async = require('async');
var evModules = config.listener.evModules;
evModules = evModules.filter(function (x) {
  'use strict';
  return x;
});  //Remove empty elements
var evInitArray = evModules.map(function (x) {
  'use strict';
  return require(x.module).init(emitter, x.config);
});

var app;

logger.info('Node Version ' + process.versions.node, { op: 'LISTENER START UP' });
logger.info('V8 Version ' + process.versions.v8, { op: 'LISTENER START UP' });
logger.info('Current Directory ' + process.cwd(), { op: 'LISTENER START UP' });
logger.info('RUSH_DIR_PREFIX: ' + process.env.RUSH_DIR_PREFIX, { op: 'LISTENER START UP' });

//Initialize add-ons
async.parallel(evInitArray,
    function onSubscribed(err, results) {
      'use strict';
      if (err) {
        logger.error('listener could not be started', { op: 'LISTENER START UP', error: 'Add-On Error: ' +  err });
        var errx = new Error(['error subscribing event listener', err]);
        errx.fatal = true;
        throw errx;
      }
    });

//This function processes a request
function assignRequest(request, data, callback) {
  'use strict';

  function processTask(err, routeObj) {
    if (!err) {

      routeObj.task.service = routeObj.service;
      store.put(routeObj.service, routeObj.task, function onWrittenReq(err) {
        var st;
        if (err) {
          logger.warning('Redis Error', { op: 'ASSIGN REQUEST', userID: request.user,
            correlator: request.traceID, error: err, force: request.forceLog });

          var error;
          //
          // OOM = Out of memory
          // MQS = Max queue size
          //
          if (err.toString().indexOf('OOM') !== -1 || err.toString().indexOf('MQS') !== -1) {
            error = { type: G.OVERLOADED };
          } else {
            error = { type: G.SERVER_ERROR, message: err.toString() };
          }
          response = apiErrorsParser.parseError(error);

          //EMIT ERROR
          var errev = {
            id: routeObj.task.id,
            traceID: routeObj.task.traceID,
            queueId: routeObj.service,
            err: err,
            date: new Date()
          };
          emitter.emit(G.EVENT_ERR, errev);

          //EMIT STATE ERROR
          st = {
            id: routeObj.task.id,
            traceID: routeObj.task.traceID,
            state: G.STATE_ERROR,
            date: new Date(),
            task: routeObj.task,
            err: err
          };
          emitter.emit(G.EVENT_NEWSTATE, st);

        } else {
          response.statusCode = 201;
          response.data = {id: id};

          //EMIT STATE PENDING
          st = {
            id: routeObj.task.id,
            traceID: routeObj.task.traceID,
            state: G.STATE_QUEUED,
            date: new Date(),
            task: routeObj.task
          };
          emitter.emit(G.EVENT_NEWSTATE, st);
        }
        callback(response);
      });
    } else {
      logger.warning('Request Error', { op: 'ASSIGN REQUEST', userID: request.user, correlator: request.traceID,
        transid: id, error: err, force : request.forceLog });
      callback(apiErrorsParser.parseErrors(err));
    }
  }

  var id = uuid.v1();

  var simpleReq = {
    id: id,
    user: request.user,
    traceID: request.traceID,
    forceLog: request.forceLog,
    method: request.method,
    httpVersion: request.httpVersion,
    path: request.url,
    headers: request.headers,
    protocol: request.protocol,
    body: data
  };

  var response = {};

  router.route(simpleReq, processTask);

}

//Start up server(s)
function startListening(done) {
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
    reqLog.headers[G.HEAD_RELAYER_PROTOCOL] = req.headers[G.HEAD_RELAYER_PROTOCOL];
    reqLog.headers[G.HEAD_RELAYER_PROXY] = req.headers[G.HEAD_RELAYER_PROXY];
    reqLog.headers[G.HEAD_RELAYER_RETRY] = req.headers[G.HEAD_RELAYER_RETRY];
    reqLog.headers[G.HEAD_RELAYER_HTTPCALLBACK] = req.headers[G.HEAD_RELAYER_HTTPCALLBACK];
    reqLog.headers[G.HEAD_RELAYER_PERSISTENCE] = req.headers[G.HEAD_RELAYER_PERSISTENCE];
    reqLog.headers[G.HEAD_RELAYER_TRACEID] = req.headers[G.HEAD_RELAYER_TRACEID];
    reqLog.headers[G.HEAD_RELAYER_ENCODING] = req.headers[G.HEAD_RELAYER_ENCODING];
    reqLog.headers['content-type'] = req.headers['content-type'];

    req.on('data', function onReqData(chunk) {
      data += chunk;
    });

    req.on('end', function onReqEnd() {
      req.headers['X-Forwarded-For'] = req.connection.remoteAddress;
      assignRequest(req, data, function writeRes(result) {

        var logMsg = { op: 'RELAY REQUEST', userID: req.user, force: req.forceLog, correlator: req.traceID };

        if (reqLog.headers[G.HEAD_RELAYER_TRACEID]) {
          logMsg.correlator = reqLog.headers[G.HEAD_RELAYER_TRACEID];
        }

        if (result.data.id) {
          res.header('Location', '/response/' + result.data.id);
          logMsg.transid = result.data.id;
        }
        //Send request
        res.send(result.statusCode, result.data);

        //Logger
        reqLog.responseTime = Date.now() - reqLog.start;
        reqLog.statusCode = result.statusCode;
        reqLog.bodyLength = data.length;
        reqLog.id = result.data;
        delete reqLog.start;

        logMsg.reqInfo = reqLog;

        logger.info('Relay Request received', logMsg);
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

      dbrelayer.getData(responseId, req.traceID, req.user, req.forceLog, function (err, data) {

        var error;

        if (err) {
          error = { type: G.SERVER_ERROR, message: err.toString() };
          response = apiErrorsParser.parseError(error);
          logger.warning('Redis Error retrieving response', { op: 'RETRIEVE RESPONSE', transid: responseId,
            correlator: req.traceID, userID: req.user, error: err, force: req.forceLog });
        } else {

          if (!data) {
            error = { type: G.UNKNOWN_RESOURCE, resourceID: responseId };
            response = apiErrorsParser.parseError(error);
            logger.warning('ID ' + responseId + ' does not exists',  { op: 'RETRIEVE RESPONSE',
              transid: responseId, userID: req.user, correlator: req.traceID, force: req.forceLog });
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
        logger.info('Retrieve Response received', { op: 'RETRIEVE RESPONSE', userID: req.user,
          correlator: response.data.traceID, transid: responseId, reqInfo: reqLog, force: req.forceLog });
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

  function setLogProperties(req, res, next) {

    var error = null;

    req.user = req.connection.remoteAddress;
    req.traceID = req.headers[G.HEAD_RELAYER_TRACEID];

    var forceValue = req.headers[G.HEAD_RELAYER_FORCELOG] || false;

    if (typeof forceValue !== 'boolean') {

      if (forceValue === 'true') {
        forceValue = true;
      } else if (forceValue === 'false') {
        forceValue = false;
      } else {
        var error = {
          type: G.INVALID_PARAMETER_ACCEPTED_VALUES,
          parameter: G.HEAD_RELAYER_FORCELOG,
          acceptedValues: [true, false]
        };
      }
    }

    if (!error) {
      req.forceLog = forceValue;
      next();
    } else {
      var parsedError = apiErrorsParser.parseError(error);
      res.send(parsedError.statusCode, parsedError.data);
    }
  }

  function cleanBlankHeaders(req, res, next) {

    for (var header in req.headers) {
      if (req.headers.hasOwnProperty(header)) {
        if (req.headers[header] === '') {
          delete req.headers[header];
        }
      }
    }

    next();
  }

  app = express();
  //app.use(dbCluster.checkAvailable);
  app.use(cleanBlankHeaders);
  app.use(setLogProperties);
  app.get('/response/:id_response', responsePath);
  app.all('/*', relayReq);

  //Start unsecure Server
  app.unsecureServer = http.createServer(app).listen(config.listener.unsecurePort);
  logger.info('Rush (UNSEC) listening on ' + config.listener.unsecurePort, { op: 'LISTENER START UP' });

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
      logger.info('Rush (SEC) listening on ' + config.listener.securePort, { op: 'LISTENER START UP' });

    } else {
      logger.error('listener could not be started', { op: 'LISTENER START UP', additionalInfo: 'Certs not found',
        secureOptions: secureOptions });
      err = new Error('No valid certificates were found in the given path');
    }
  }

  if (!err) {
    store.openConnections(done);
    logger.info('Listener started', { op: 'LISTENER START UP' });
  } else {
    if (done) {
      done(err, null);
    } else {
      throw err;
    }
  }

}

function start(done){
  'use strict';
  dbCluster.init(function(err){
      monitoringProbe.start();
      startListening(function(){
        if(done){
          done();
        }
      });
  });
}

function stop(done) {
  'use strict';

  monitoringProbe.stop();

  if (app.unsecureServer) {
    app.unsecureServer.close(function() {
      if (app.secureServer) {
        app.secureServer.close(function() {
          app.secureServer = null;
          app.unsecureServer = null;
          store.closeConnections(done);
        });
      } else {
        store.closeConnections(done);
      }
    });
  } else {
    store.closeConnections(done);
  }
}

exports.start = start;
exports.stop = stop;

