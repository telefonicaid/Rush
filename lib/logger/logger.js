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

var util = require('util');
var stackParser = require('stack-parser');
var globals = require('./globals.js');
var consoleTransport = require('./transports/console.js');
var fileTransport = require('./transports/file.js');

var config = globals.defaultConfig;
var logger = null;

function createDefaultLogger(config) {

  if (config) {

    logger = {};

    /**
     *
     * @param level Standard default values (DEBUG, INFO, NOTICE, WARNING, ERROR, CRIT, ALERT, EMERG)
     * @param message Log Message
     * @param logObj An object or an array that will be printed after the message
     * @returns {*}
     */
    logger.log = function (level, message, logObj) {

      for (var i = 0; i < logger.transports.length; i++) {

        var transport = logger.transports[i];
        var transportLevel = transport.level || globals.defaultConfig.logLevel;

        if (globals.defaultLevels[level] >= globals.defaultLevels[transportLevel] || logObj[globals.force]) {
          transport.log(level, message, logObj);
        }
      }
    };

    //Transports
    logger.transports = [];

    if (config.Console) {
      logger.transports.push(new consoleTransport.Console(config.Console));
    }

    if (config.File) {
      logger.transports.push(new fileTransport.File(config.File));
    }

    //Exit on error
    var exitOnError = function (err) {

      var exit = config.exitOnError || true,
          logType, logMsg;

      var component = {};

      //Parse stack
      try {
        var items = stackParser.parse(err.stack);
        component = items[0] || {};
      } catch(e) {
        //Nothing to do...
      }

      //Log message
      logger.log('emerg', err.message, {component: component.file, line: component.line } );

      //Exit (due requirements)
      if (exit) {
        process.exit(-1);
      }
      return exit;
    }

    process.on('uncaughtException', exitOnError);

  } else {
    throw new Error('Logger cannot be created without a configuration');
  }


}

function setConfig(newCfg) {
  'use strict';
  config = newCfg;
  createDefaultLogger(config);
}

function newLogger() {
  'use strict';

  //Create default logger
  if (!logger) {
    createDefaultLogger(config);
  }

  var moduleLogger = {};

  moduleLogger.log = function(level, message, logObj) {

    logObj = logObj || {};
    logObj.component = logObj.component || this.prefix;

    logger.log(level, message, logObj);
  };

  //Methods
  for (var lvl in globals.defaultLevels) {
    if (globals.defaultLevels.hasOwnProperty(lvl)) {
      moduleLogger[lvl] = function _block(aLevel) {
        return function (msg, obj) {
          return moduleLogger.log(aLevel, msg, obj);
        };
      }(lvl);
    }
  }

  // legacy
  moduleLogger.warning = moduleLogger.warn;

  return moduleLogger;
}


exports.newLogger = newLogger;
exports.setConfig = setConfig;
/*
 debug: 0,
 info: 1,
 notice: 2,
 warning: 3,
 error: 4,
 crit: 5,
 alert: 6,
 emerg: 7

 The list of syslog severity Levels:
 0 Emergency: system is unusable
 1 Alert: action must be taken immediately
 2 Critical: critical conditions
 3 Error: error conditions
 4 Warning: warning conditions
 5 Notice: normal but significant condition
 6 Informational: informational messages
 7 Debug: debug-level messages
 Recommended practice is to use the Notice or Informational level for normal messages.


 A detailed explanation of the severity Levels:
 DEBUG:
 Info useful to developers for debugging the application, not useful during operations
 INFORMATIONAL:
 Normal operational messages - may be harvested for reporting, measuring throughput, etc - no action required
 NOTICE:
 Events that are unusual but not error conditions - might be summarized in an email to developers or admins to spot
 potential problems - no immediate action required
 WARNING:
 Warning messages - not an error, but indication that an error will occur if action is not taken, e.g. file system 85%
 full - each item must be resolved within a given time
 ERROR:
 Non-urgent failures - these should be relayed to developers or admins; each item must be resolved within a given time
 ALERT:
 Should be corrected immediately - notify staff who can fix the problem - example is loss of backup ISP connection
 CRITICAL:
 Should be corrected immediately, but indicates failure in a primary system - fix CRITICAL problems before ALERT -
 example is loss of primary ISP connection
 EMERGENCY:
 A "panic" condition - notify all tech staff on call? (earthquake? tornado?) - affects multiple apps/servers/sites...



 */
