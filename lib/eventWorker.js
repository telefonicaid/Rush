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

var http = require('http');
var https = require('https');

var MG = require('./myGlobals').C;
var url = require('url');
var configGlobal = require('./configBase.js');
var config = configGlobal.consumer;

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

http.globalAgent.maxSockets = config.maxSockets;
https.globalAgent.maxSockets = config.maxSockets;

function urlErrors(pUrl) {
  'use strict';
  var parsedUrl;
  if (pUrl) {
    parsedUrl = url.parse(pUrl);
    if (!parsedUrl.protocol) {
      return ('Protocol is not defined');
    } else if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return ('Invalid protocol ' + parsedUrl.protocol);
    } else {
      if (! parsedUrl.hostname) {
        return ('Hostname expected. Empty host after protocol');
      }
    }
  }

  return null;
}

function validateHeaders(simpleRequest) {

  var errorsHeaders = [];

  //Check required headers
  if (! simpleRequest.headers[MG.HEAD_RELAYER_HOST]) {
    var error = {};
    error.type = MG.MISSING_PARAMETER;
    error.parameter = MG.HEAD_RELAYER_HOST;

    errorsHeaders.push(error);

  } else {

    //Check X-Relayer-Host format
    //Regex: host[:port]
    //host is an string that can contains letters, numbers, '.' and '-'
    //port is a number from 0 to 99999
    var REGEX_HOSTNAME_PORT = new RegExp('^[a-zA-Z0-9\.\-]+(:([0-9]{1,5}))?$');
    var result = REGEX_HOSTNAME_PORT.exec(simpleRequest.headers[MG.HEAD_RELAYER_HOST]);
    if (!result) {

      var error = {};
      error.type = MG.INVALID_PARAMETER;
      error.parameter = MG.HEAD_RELAYER_HOST;
      error.userMessage = 'Valid format: host[:port]';

      errorsHeaders.push(error);

    } else {

      var port = result[2];
      if (port > MG.MAX_PORT) {

        var error = {};
        error.type = MG.INVALID_PARAMETER;
        error.parameter = MG.HEAD_RELAYER_HOST;
        error.userMessage = 'Port should be a number between 0 and ' + MG.MAX_PORT;

        errorsHeaders.push(error);

      }
    }

    //Check URLs
    var urlHeaders = [ MG.HEAD_RELAYER_HTTPCALLBACK, MG.HEAD_RELAYER_HTTPCALLBACK_ERROR];

    for (var i = 0; i < urlHeaders.length; i++) {
      var urlToCheck = simpleRequest.headers[urlHeaders[i]];
      var urlError = urlErrors(urlToCheck);

      if (urlError) {

        var error = {};
        error.type = MG.INVALID_PARAMETER;
        error.parameter = urlHeaders[i];
        error.userMessage = urlError;

        errorsHeaders.push(error);
      }
    }

    //check Retry header
    var retryStr = simpleRequest.headers[MG.HEAD_RELAYER_RETRY];
    if (retryStr) {
      var retrySplit = retryStr.split(',');
      if (! retrySplit.every(function(num) {
        return isFinite(Number(num));
      })) {

        var error = {}
        error.type = MG.INVALID_PARAMETER;
        error.parameter = MG.HEAD_RELAYER_RETRY;
        error.userMessage = 'Invalid retry value: ' + retryStr;

        errorsHeaders.push(error);
      }
    }

    //check Persistence Header
    var persistence = simpleRequest.headers[MG.HEAD_RELAYER_PERSISTENCE];
    if (persistence !== undefined) {

      if (persistence === '') {
        delete simpleRequest.headers[MG.HEAD_RELAYER_PERSISTENCE];
      } else if (persistence !== 'BODY' && persistence !== 'STATUS' &&
          persistence !== 'HEADER') {

        var error = {};
        error.type = MG.INVALID_PARAMETER_ACCEPTED_VALUES;
        error.parameter = MG.HEAD_RELAYER_PERSISTENCE;
        error.acceptedValues = ['BODY', 'STATUS', 'HEADER'];

        errorsHeaders.push(error);
      }
    }

    //check protocol Header
    var protocol = simpleRequest.headers[MG.HEAD_RELAYER_PROTOCOL];
    if (protocol !== undefined) {

      if (protocol === '') {
        delete simpleRequest.headers[MG.HEAD_RELAYER_PROTOCOL];
      } else if (protocol !== 'http' && protocol !== 'https') {

        var error = {};
        error.type = MG.INVALID_PARAMETER_ACCEPTED_VALUES;
        error.parameter = MG.HEAD_RELAYER_PROTOCOL;
        error.acceptedValues = ['http', 'https'];

        errorsHeaders.push(error);
      }
    }

  }

  return errorsHeaders;

}

function createTask(simpleRequest, callback) {
  'use strict';

  logger.debug({ opType: 'CREATE TASK', userID: simpleRequest.user, traceID: simpleRequest.id, msg: 'Arguments: '},
      [ simpleRequest ]);

  // If there is a default proxy in config and no proxy was set in 'x-relayer-proxy'
  // use default proxy
  if(config.proxy && !simpleRequest.headers[MG.HEAD_RELAYER_PROXY] ) {
    simpleRequest.headers[MG.HEAD_RELAYER_PROXY] = config.proxy;
  }

  var errorsHeaders = validateHeaders(simpleRequest);

  if (errorsHeaders.length > 0) {
    callback(errorsHeaders, null);
  } else {
    callback(null, simpleRequest);
  }
}

function doJob(task, callback) {
  'use strict';

  logger.debug({ opType: 'DO JOB', userID: task.user, traceID: task.id, msg: 'Arguments: '}, [ task ]);

  var httpModule;
  var targetHost = task.headers[MG.HEAD_RELAYER_HOST], 
      proxyHost = task.headers[MG.HEAD_RELAYER_PROXY],
      req;

  if (!targetHost) {
    logger.warning({ opType: 'DO JOB', userID: task.user, traceID: task.id, msg: 'No target host' });
  } else {

    var protocol = task.headers[MG.HEAD_RELAYER_PROTOCOL] || task.protocol; // || 'http'
    var completeURL = protocol + '://' + targetHost + task.path;
    var options = url.parse(completeURL);
    task.headers.host = options.host;

    // if a proxy is specified ('X-Relayer-Proxy' or default by config)
    // options.host is changed to go to the proxy. Hopefully, headers host
    // remains as set from 'X-Relayer-Host'
    if(proxyHost) {
      var optionsProxy = proxyHost.split(':');
      options.host = proxyHost;
      options.port = optionsProxy[1];
      options.hostname = optionsProxy[0];
      options.path = completeURL;
    }

    if (options.protocol === 'https:') {
      httpModule = https;
    } else { // assume plain http
      httpModule = http;
    }

    options.headers = delXrelayerHeaders(task.headers);
    options.method = task.method;
    if (config.agent !== undefined) {
      options.agent = config.agent;
    }

    req = httpModule.request(options, function(rlyRes) {
      req.rush_connected = true;
      if (Math.floor(rlyRes.statusCode / 100) === 2) {
        //if no 5XX ERROR
        getResponse(rlyRes, task, function(task, respObj) {
          //PERSISTENCE
          if (callback) {
            callback(null, respObj);
          }
        });
      } else {
        getResponse(rlyRes, task, function(task, respObj) {
          var e = {
            id: task.id,
            topic: task.headers[MG.HEAD_RELAYER_TOPIC],
            exception: {
              exceptionId: 'SVC Relayed Host Error',
              exceptionText: 'Not relayed request ' + rlyRes.statusCode
            },
            statusCode: rlyRes.statusCode,
            headers: rlyRes.headers,
            body: respObj.body
          };
          logger.warning({ opType: 'DO JOB', userID: task.user, traceID: task.id, msg: 'Server Error (4xx, 5xx)' }, e);
          doRetry(task, e, callback);
        });

      }
    });

    req.rush_connected = false;
    setTimeout(function(){
      if(!req.rush_connected) {
        logger.warning({ opType: 'DO JOB', userID: task.user,  traceID: task.id,
          msg: 'config.responseTimeout reached. Task cancelled' });
        req.abort();
      }
    }, config.responseTimeout || 60000);

    req.on('error', function(e) {
      e.resultOk = false;
      var errObj = {
        id: task.id,
        topic: task.headers[MG.HEAD_RELAYER_TOPIC],
        //error: e.code + '(' + e.syscall + ')'
        exception: {
          exceptionId: 'SVC Relayed Host Error',
          exceptionText: e.message
        }
      };

      logger.warning({ opType: 'DO JOB', userID: task.user, traceID: task.id, msg: 'Request Error' }, e);
      doRetry(task, errObj, callback);
    });

    if (options.method === 'POST' || options.method === 'PUT') {
      //write body
      req.write(task.body);
    }
    req.end(); //?? sure HERE?
  }
}

function getResponse(resp, task, callback) {
  'use strict';

  var data = [];
  var length = 0;

  resp.on('data', function(chunk) {
    data.push(chunk);
    length += chunk.length;
  });

  resp.on('end', function(chunk) {
    if (chunk) {
      data.push(chunk);
      length += chunk.length;
    } //avoid tail undefined

    var body_encoding = task.headers[MG.HEAD_RELAYER_ENCODING];

    if (! body_encoding || MG.ACEPTS_ENCODINGS.indexOf(body_encoding) === - 1) {
      body_encoding = 'utf8';
    }

    var buf = new Buffer(length);
    for (var i = 0, pos = 0; i < data.length; i++) {
      data[i].copy(buf, pos);
      pos += data[i].length;
    }

    var encodedBody = buf.toString(body_encoding);

    var respObj = {
      id: task.id,
      topic: task.headers[MG.HEAD_RELAYER_TOPIC],
      statusCode: resp.statusCode,
      encoding: body_encoding,
      headers: resp.headers,
      body: encodedBody
    };

    if (callback) {
      callback(task, respObj);
    }
  });
}


function doRetry(task, error, callback) {
  'use strict';

  var retryList = task.headers[MG.HEAD_RELAYER_RETRY];
  var time = - 1;
  if (retryList) {
    var retryA = retryList.split(',');
    if (retryA.length > 0) {
      time = parseInt(retryA.shift(), 10);
      if (retryA.length > 0) {
        // there is retry times still
        task.headers[MG.HEAD_RELAYER_RETRY] = retryA.join(',');
      } else {
        //Retry End with no success
        delete task.headers[MG.HEAD_RELAYER_RETRY];
      }
      if (time > 0) {
        setTimeout(function() {
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
  'use strict';

  var cleanHeaders = {};
  for (var h in headers) {
    if (headers.hasOwnProperty(h)) {
      if (h.toLowerCase().indexOf('x-relayer') !== 0) {
        cleanHeaders[h] = headers[h];
      }
    }
  }
  return cleanHeaders;
}
exports.doJob = doJob;
exports.createTask = createTask;

//require('./hookLogger.js').init(exports, logger);
