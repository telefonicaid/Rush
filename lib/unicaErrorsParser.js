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

var MG = require('./myGlobals').C;

var parseError = function(err) {
  'use strict';

  var parsedError = {};

  if (err.type === MG.MISSING_PARAMETER) {
    parsedError.statusCode = 400;
    parsedError.data = {
      exceptionId: 'SVC1000',
      exceptionText: 'Missing mandatory parameter: ' + err.parameter
    };
  } else if (err.type === MG.INVALID_PARAMETER) {
    parsedError.statusCode = 400;
    parsedError.data = {
      exceptionId: 'SVC0002',
      exceptionText: 'Invalid parameter value: ' + err.parameter
    };
  } else if (err.type === MG.INVALID_PARAMETER_ACCEPTED_VALUES) {
    parsedError.statusCode = 400;
    parsedError.data = {
      exceptionId: 'SVC0003',
      exceptionText: 'Invalid parameter value: ' + err.parameter + '. Possible values are: ' +
          err.acceptedValues.join(', ')
    };
  } else if (err.type === MG.SERVER_ERROR) {
    parsedError.statusCode = 500;
    parsedError.data = {
      exceptionId: 'SVR1000',
      exceptionText: 'Generic Server Error: ' + err.message
    };
  } else if (err.type === MG.UNKNOWN_RESOURCE) {
    parsedError.statusCode = 404;
    parsedError.data = {
      exceptionId: 'SVC1006',
      exceptionText: 'Resource ' + err.resourceID + ' does not exist'
    };
  } else if (err.type === MG.NOT_IMPLEMENTED) {
    parsedError.statusCode = 501;
  } else if (err.type === MG.OVERLOADED) {
    parsedError.statusCode = 503;
    parsedError.data = {
      exceptionId: 'SVR1006',
      exceptionText: 'Service temporarily unavailable: system overloaded'
    };
  }

  if (err.userMessage) {
    parsedError.data.userMessage = err.userMessage;
  }

  return parsedError;
};

var parseErrors = function(errs) {
  'use strict';
  //UNICA API can only return one error
  return parseError(errs[0]);
};

exports.parseError = parseError;
exports.parseErrors = parseErrors;

