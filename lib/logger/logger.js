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

var stackParser = require('stack-parser');
var globals = require('./globals.js');
var defaultConfig = require('./defaultConfig.js').defaultConfig;
var consoleTransport = require('./transports/console.js');
var fileTransport = require('./transports/file.js');

var logger = null;            //Current logger used. A new Logger will be created whenever config is changed.
var loggers = [];             //This array is need to log messages on each logger on uncaughtException.

function createDefaultLogger(config) {

  if (!config) {
    throw new Error('Logger cannot be created without a configuration');
  } else {

    logger = {};

    //Copy config
    logger.config = {};
    for (var property in config) {
      if (config.hasOwnProperty(property)) {
        logger.config[property] = config[property];
      }
    }

    //Set default properties
    logger.config.logLevel = logger.config.logLevel || defaultConfig.logLevel;

    logger.config.inspectDepth = logger.config.inspectDepth === undefined ?
        defaultConfig.inspectDepth : logger.config.inspectDepth;

    logger.config.enableForceLog = logger.config.enableForceLog === undefined ?
        defaultConfig.enableForceLog : logger.config.enableForceLog;

    /**
     *
     * @param level Standard default values (DEBUG, INFO, NOTICE, WARNING, ERROR, CRIT, ALERT, EMERG)
     * @param message Log Message
     * @param logObj An object or an array that will be printed after the message
     * @returns {*}
     */
    logger.log = function (level, message, logObj) {

      for (var i = 0; i < this.transports.length; i++) {

        var transport = this.transports[i];
        var transportLevel = transport.level || this.config.logLevel;

        if (globals.DEFAULTL_LEVELS[level] >= globals.DEFAULTL_LEVELS[transportLevel] ||
            (this.config.enableForceLog && logObj[globals.FORCE])) {
          transport.log(level, message, logObj);
        }
      }
    };

    //Transports
    logger.transports = [];

    if (config.Console) {
      logger.transports.push(new consoleTransport.Console(config.Console, logger.config.inspectDepth));
    }

    if (config.File) {
      logger.transports.push(new fileTransport.File(config.File, logger.config.inspectDepth));
    }

    //Push logger into loggers array
    loggers.push(logger);

  }


}

function setConfig(newCfg) {
  'use strict';
  createDefaultLogger(newCfg);
}

function newLogger() {
  'use strict';

  //Create default logger
  if (!logger) {
    createDefaultLogger(defaultConfig);
  }

  var moduleLogger = {};
  var currentLogger = logger;

  moduleLogger.log = function(level, message, logObj) {

    logObj = logObj || {};
    logObj.component = logObj.component === undefined ? this.prefix : logObj.component;

    currentLogger.log(level, message, logObj);
  };

  //Set a method for each log level (debug, info, warn, err,...)
  for (var lvl in globals.DEFAULTL_LEVELS) {
    if (globals.DEFAULTL_LEVELS.hasOwnProperty(lvl)) {
      moduleLogger[lvl] = moduleLogger.log.bind(moduleLogger, lvl);
    }
  }

  // legacy
  moduleLogger.warning = moduleLogger.warn;

  return moduleLogger;
}

//Exit on error
var exitOnError = function (err) {

  var exit, logType = 'emerg';

  var component = {};

  //Parse stack
  try {
    var items = stackParser.parse(err.stack);
    component = items[0] || {};
  } catch(e) {
    //Nothing to do...
  }

  //Log message on each logger
  loggers.forEach(function(logger) {
    exit = exit || logger.config.exitOnError;
    logger.log(logType, err.message, {component: component.file, line: component.line } );
  });

  //Exit (due requirements)
  //Program will exit if at least one logger wants to exit
  exit = exit === undefined ? true : exit;
  if (exit) {
    process.exit(-1);
  }
  return exit;
}

process.on('uncaughtException', exitOnError);


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
