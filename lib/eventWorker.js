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

var http = require('http');
var https = require('https');

var MG = require('./myGlobals').C;
var url = require('url');
var configGlobal = require('./config.js');
var config = configGlobal.consumer;

var path = require('path');
var fs = require('fs');
var retryBuckets = require('./retryBuckets.js');
var log = require('./logger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

var qs = require('querystring');

http.globalAgent.maxSockets = config.maxSockets;
https.globalAgent.maxSockets = config.maxSockets;

/*This reads the certificates directory to
add them to the list of trusted servers*/
var cas = [],
    casFiles,
    casPath;

function getExtension(filename) {
  'use strict';
  var ext = path.extname(filename||'').split('.');
  return ext[ext.length - 1];
}

if (config.casDir) {
  try {
    casPath = path.resolve(__dirname, config.casDir);
    casFiles = fs.readdirSync(casPath); // []
    for (var i = 0; i < casFiles.length; i++) {
      var certPath = path.resolve(casPath, casFiles[i]);
      if (getExtension(certPath) === 'crt') {
        cas.push(fs.readFileSync(certPath));
      }
    }
  } catch (err) {
    logger.warning(err,{ op: 'GET CERTIFICATES'});
  }
}   else {
  logger.warning('CAs dir not set', { op: 'GET CERTIFICATES'});
}

////////////////////////////////////////////////////////////////
////////////////////////////LISTENER////////////////////////////
////////////////////////////////////////////////////////////////

function urlErrors(pUrl, https) {
  'use strict';
  var parsedUrl;
  https = https === undefined ?  true : https;
  if (pUrl) {
    parsedUrl = url.parse(pUrl);
    if (!parsedUrl.protocol) {
      return ('Protocol is not defined');
    } else if((https && parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:')  ||
        (!https && parsedUrl.protocol !== 'http:')) {
      return ('Invalid protocol ' + parsedUrl.protocol);
    } else {
      if (! parsedUrl.hostname) {
        return ('Hostname expected. Empty host after protocol');
      }
    }
  }

  return null;
}

function checkHost(host) {
  'use strict';

  //Regex: host[:port]
  //host is an string that can contains letters, numbers, '.' and '-'
  //port is a number from 0 to 99999
  var REGEX_HOSTNAME_PORT = new RegExp('^[a-zA-Z0-9\\.\\-]+(:([0-9]{1,5}))?$');
  var result = REGEX_HOSTNAME_PORT.exec(host);

  if (!result) {
    return 'Valid format: host[:port]';
  } else {
    var port = result[2];
    if (port > MG.MAX_PORT) {
      return 'Port should be a number between 0 and ' + MG.MAX_PORT;
    }
  }

  return null;

}

function validateHeaders(simpleRequest) {
  'use strict';

  var errorsHeaders = [], error;

  //Check required headers
  if (! simpleRequest.headers[MG.HEAD_RELAYER_HOST]) {
    error = {};
    error.type = MG.MISSING_PARAMETER;
    error.parameter = MG.HEAD_RELAYER_HOST;

    errorsHeaders.push(error);

  } else {

    //Check X-Relayer-Host and X-Relayer-Proxy format
    var headersToCheck = [ MG.HEAD_RELAYER_HOST, MG.HEAD_RELAYER_PROXY ];

    for (var i = 0; i < headersToCheck.length; i++) {
      var hostToCheck = simpleRequest.headers[headersToCheck[i]];
      var hostError = checkHost(hostToCheck);

      if (hostError) {
        error = {};
        error.type = MG.INVALID_PARAMETER;
        error.parameter = headersToCheck[i];
        error.userMessage = hostError;

        errorsHeaders.push(error);
      }
    }

    //Check URLs
    var urlHeaders = [ MG.HEAD_RELAYER_HTTPCALLBACK, MG.HEAD_RELAYER_HTTPCALLBACK_ERROR ];

    for (i = 0; i < urlHeaders.length; i++) {
      var urlToCheck = simpleRequest.headers[urlHeaders[i]];
      var urlError = urlErrors(urlToCheck, false);

      if (urlError) {

        error = {};
        error.type = MG.INVALID_PARAMETER;
        error.parameter = urlHeaders[i];
        error.userMessage = urlError;

        errorsHeaders.push(error);
      }
    }

    //check Retry header (Retry header indicates the number of retries that should be done if a petition fails)
    var retryStr = simpleRequest.headers[MG.HEAD_RELAYER_RETRY];
    if (retryStr) {

      if (isNaN(Number(retryStr))) {
        error = {};
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
      } else if (MG.ACCEPTED_PERSISTENCE.indexOf(persistence) === -1) {

        error = {};
        error.type = MG.INVALID_PARAMETER_ACCEPTED_VALUES;
        error.parameter = MG.HEAD_RELAYER_PERSISTENCE;
        error.acceptedValues = MG.ACCEPTED_PERSISTENCE;

        errorsHeaders.push(error);
      }
    }

    //check protocol Header
    var protocol = simpleRequest.headers[MG.HEAD_RELAYER_PROTOCOL];
    if (protocol !== undefined) {

      if (protocol === '') {
        delete simpleRequest.headers[MG.HEAD_RELAYER_PROTOCOL];
      } else if (MG.ACCEPTED_PROTOCOLS.indexOf(protocol) === -1) {

        error = {};
        error.type = MG.INVALID_PARAMETER_ACCEPTED_VALUES;
        error.parameter = MG.HEAD_RELAYER_PROTOCOL;
        error.acceptedValues = MG.ACCEPTED_PROTOCOLS;

        errorsHeaders.push(error);
      }
    }

    //check 'X-Relayer-header'
    var extraHeaders = simpleRequest.headers[MG.HEAD_RELAYER_HEADER];
    if (extraHeaders) {
      extraHeaders.split(',').forEach(function (h) {
        var value = '' + qs.unescapeBuffer(h,true);
        var parts = value.split(':');

        if (parts.length < 2) {

          error = {};
          error.type = MG.INVALID_PARAMETER;
          error.parameter = MG.HEAD_RELAYER_HEADER;
          error.userMessage = 'Value for header ' + parts[0].trim() + ' is not defined';

          errorsHeaders.push(error);

        }
      });
    }

  }

  return errorsHeaders;

}

function createTask(simpleRequest, callback) {
  'use strict';

  logger.debug('New Task', { op: 'CREATE TASK', userID: simpleRequest.user, correlator: simpleRequest.traceID,
    transid: simpleRequest.id, arguments: [ simpleRequest ] });

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

////////////////////////////////////////////////////////////////
////////////////////////////CONSUMER////////////////////////////
////////////////////////////////////////////////////////////////

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

    var bodyEncoding = task.headers[MG.HEAD_RELAYER_ENCODING];

    if (! bodyEncoding || MG.ACEPTS_ENCODINGS.indexOf(bodyEncoding) === - 1) {
      bodyEncoding = 'utf8';
    }

    var buf = new Buffer(length);
    for (var i = 0, pos = 0; i < data.length; i++) {
      data[i].copy(buf, pos);
      pos += data[i].length;
    }

    var encodedBody = buf.toString(bodyEncoding);

    var respObj = {
      id: task.id,
      traceID: task.traceID,
      statusCode: resp.statusCode,
      encoding: bodyEncoding,
      headers: resp.headers,
      body: encodedBody
    };

    if (callback) {
      callback(task, respObj);
    }
  });
}

function doRetry(task, error, callback) {
  //Retry bucket is worker independent, so maxRetry need to be extracted here.
  var maxRetry = task.headers[MG.HEAD_RELAYER_RETRY] || 0;
  retryBuckets.insertOnBucket(task, error, maxRetry, callback);
}

function doJob(task, callback) {
  'use strict';

  var traceID = task.traceID;

  logger.debug('Do Job', { op: 'DO JOB', userID: task.user, correlator: traceID, transid: task.id,
    arguments: [ task ]});

  var httpModule;
  var targetHost = task.headers[MG.HEAD_RELAYER_HOST],
      proxyHost = task.headers[MG.HEAD_RELAYER_PROXY],
      extraHeaders =  task.headers[MG.HEAD_RELAYER_HEADER],
      req;

  if (!targetHost) {
    logger.warning('No target host', { op: 'DO JOB', userID: task.user, correlator: traceID,
      transid: task.id });
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
      //This header takes precedence over config
      if (task.headers[MG.HEAD_RELAYER_SERVER_CERT]) {
        options.ca = new Buffer(task.headers[MG.HEAD_RELAYER_SERVER_CERT], 'base64');
        options.rejectUnathorized = true;
      } else {
        options.rejectUnauthorized = !config.trustAllServers;
        if (!config.trustAllServers) {
          options.ca = cas;
        }
      }
    } else { // assume plain http
      httpModule = http;
    }

    options.headers = delXrelayerHeaders(task.headers);

    if (extraHeaders) {
      extraHeaders.split(',').forEach(function (h) {
        var value = '' + qs.unescapeBuffer(h,true);
        options.headers[value.split(':')[0].trim()] = value.split(':').slice(1).join(':').trim();
      });
    }



    options.method = task.method;
    if (config.agent !== undefined) {
      options.agent = config.agent;
    }

    req = httpModule.request(options, function(rlyRes) {
      req.rushConnected = true;
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
            traceID: task.traceID,
            exception: {
              exceptionId: 'SVC Relayed Host Error',
              exceptionText: 'Not relayed request ' + rlyRes.statusCode
            },
            statusCode: rlyRes.statusCode,
            headers: rlyRes.headers,
            body: respObj.body
          };
          logger.warning('Server Error (4xx, 5xx)', { op: 'DO JOB', userID: task.user, correlator: traceID,
            transid: task.id, error: e });

          //Retry (if specified)
          doRetry(task, e, callback);
        });

      }
    });

    req.rushConnected = false;
    setTimeout(function(){
      if(!req.rushConnected) {
        logger.warning('config.responseTimeout reached. Task cancelled', { op: 'DO JOB', userID: task.user,
          correlator: traceID, transid : task.id });
        req.abort();
      }
    }, config.responseTimeout || MG.MAX_TIMEOUT);

    req.on('error', function(e) {
      req.rushConnected = true;
      e.resultOk = false;
      var errObj = {
        id: task.id,
        traceID: task.traceID,
        //error: e.code + '(' + e.syscall + ')'
        exception: {
          exceptionId: 'SVC Relayed Host Error',
          exceptionText: e.message
        }
      };

      logger.warning('Request Error', { op: 'DO JOB', userID: task.user, correlator: traceID,
        transid: task.id, error: e});

      //Retry (if specified)
      doRetry(task, errObj, callback);
    });

    if (options.method === 'POST' || options.method === 'PUT') {
      //write body
      req.write(task.body);
    }
    req.end(); //?? sure HERE?
  }
}

exports.doJob = doJob;
exports.createTask = createTask;

//require('./hookLogger.js').init(exports, logger);
