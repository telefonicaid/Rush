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
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return ('Invalid protocol ' + pUrl);
    } else {
      if (! parsedUrl.hostname) {
        return ('Hostname expected. Empty host after protocol');
      }
    }
  }

  return null;
}
function createTask(simpleRequest, callback) {
  'use strict';

  
  // If there is a default proxy in config and no proxy was set in 'x-relayer-proxy'
  // use default proxy
    
  if(config.proxy && !simpleRequest.headers[MG.HEAD_RELAYER_PROXY] ) {
      simpleRequest.headers[MG.HEAD_RELAYER_PROXY] = config.proxy;        
  }
    
  //Check required headers
  if (! simpleRequest.headers[MG.HEAD_RELAYER_HOST]) {
    callback([MG.HEAD_RELAYER_HOST + ' is missing'], null);
  } else {
    var errorsHeaders = [];
    //check URLS
    errorsHeaders = [simpleRequest.headers[MG.HEAD_RELAYER_HTTPCALLBACK],
      simpleRequest.headers[MG.HEAD_RELAYER_HTTPCALLBACK_ERROR],
      simpleRequest.headers[MG.HEAD_RELAYER_HOST]
    ].map(urlErrors).filter(function(e) {
          return e !== null;
        });

    //check Retry header
    var retryStr = simpleRequest.headers[MG.HEAD_RELAYER_RETRY];
    if (retryStr) {
      var retrySplit = retryStr.split(',');
      if (! retrySplit.every(function(num) {
        return isFinite(Number(num));
      })) {
        errorsHeaders.push('invalid retry value: ' + retryStr);
      }
    }
    //check Persistence Header
    var persistence = simpleRequest.headers[MG.HEAD_RELAYER_PERSISTENCE];
    if (persistence) {
      if (persistence !== 'BODY' && persistence !== 'STATUS' &&
          persistence !== 'HEADER') {
        errorsHeaders.push('invalid persistence type: ' + persistence);
      }
    }
    if (errorsHeaders.length > 0) {
      callback(errorsHeaders, null);
    } else {
      callback(null, simpleRequest);
    }
  }
}

function doJob(task, callback) {
  'use strict';
  var httpModule;

  var targetHost = task.headers[MG.HEAD_RELAYER_HOST], 
      proxyHost = task.headers[MG.HEAD_RELAYER_PROXY],
      req;
  if (! targetHost) {
    logger.warning('doJob', 'No target host');
  } else {
    var options = url.parse(targetHost);
    task.headers.host = options.host;
    
    // if a proxy is specified ('X-Relayer-Proxy' or default by config)
    // options.host is changed to go to the proxy. Hopefully, headers host
    // remains as set from 'X-Relayer-Host'
    if(proxyHost) {
        var optionsProxy = proxyHost.split(':');
        options.host = proxyHost;
        options.port = optionsProxy[1];
        options.hostname = optionsProxy[0];
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
            error: 'Not relayed request ' + rlyRes.statusCode,
            statusCode: rlyRes.statusCode,
            headers: rlyRes.headers,
            body: respObj.body
          };
          handleRequestError(task, e, callback);
        });

      }
    });
    req.on('error', function(e) {
      e.resultOk = false;
      var errObj = {
        id: task.id,
        topic: task.headers[MG.HEAD_RELAYER_TOPIC],
        error: e.code + '(' + e.syscall + ')'
      };

      logger.warning('doJob', e);
      handleRequestError(task,
          errObj,
          callback);
    });

    if (options.method === 'POST' || options.method === 'PUT') {
      //write body
      req.write(task.body);
    }
    req.end(); //?? sure HERE?
  }
}

function handleRequestError(task, e, callback) {
  'use strict';
  logger.warning('handleRequestError', e);
  doRetry(task, e, callback);

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

require('./hookLogger.js').init(exports, logger);
