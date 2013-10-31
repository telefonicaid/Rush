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

/*
 * Since Winston has a predefined log style defined in 'common' module, it's necessary to modify this module
 * in order to accomplish TID Log Style guide. 'personalizedCommon.js' modifies that module and need to be required
 * even if not used
 */

var util = require('util');
var common = require('./personalizedCommon.js');
var winston = require('winston');
var stackParser = require('stack-parser');
var os = require('os');
var logger = null;

var hostname = os.hostname();
var winstonLogger = null;

var config = {
  logLevel: 'debug',
  inspectDepth: 2,
  Console: {
    level: 'debug',
    timestamp: true
  },
  File: {
    //FIXME: Filename should be changed to meet PID requirements
    level: 'debug',
    filename: 'pditclogger.log',
    timestamp: true,
    json: false
  }
};

function createLogMessage(level, message, logObj) {
  'use strict';

  var msg = '';

  var COMPONENT = 'component', LEVEL = 'level', CORRELATOR = 'correlator', OP = 'op', TRANSID = 'transid';
  var predefinedValues = [COMPONENT, LEVEL, CORRELATOR, OP, TRANSID];
  var prefix = '?';

  if (this) {
    prefix = this.prefix ? this.prefix : '?';
  }

  //Set default value
  logObj = logObj || {};

  //PDI Format
  msg += ' | lvl=' + level.toUpperCase();                                                         //Log level
  msg += ' | op=' + (logObj[OP] ? logObj[OP] : 'DEFAULT');                                        //Op Type
  msg += ' | msg=' + message;                                                                     //User message
  msg += ' | corr=' + (logObj[CORRELATOR] ? logObj[CORRELATOR] : 'N/A');                          //UNICA Correlator
  msg += ' | trans=' + (logObj[TRANSID] ? logObj[TRANSID] : 'N/A');                               //Transaction ID
  msg += ' | hostname=' + os.hostname();                                                          //Machine
  msg += ' | component=' + (logObj[COMPONENT] ? logObj[COMPONENT] : prefix);                      //Component

  try {

    if (logObj !== null && logObj !== undefined) {

      for (var i in logObj) {
        if (logObj.hasOwnProperty(i)) {

          //Values printed previously won't be printed again
          if (predefinedValues.indexOf(i) === -1) {

            msg += ' | ' + i + '=';

            if (util.isArray(logObj[i])) {

              msg += '[';

              //First element
              if (logObj[i].length > 0) {
                msg += util.inspect(logObj[i][0], false, config.inspectDepth);
              }

              //Remaining elements
              for (var ix = 1; ix < logObj[i].length; ix++) {
                msg += ', ' + util.inspect(logObj[i][ix], false, config.inspectDepth);
              }

              msg += ']';


            } else {
              msg += util.inspect(logObj[i], false, config.inspectDepth);
            }
          }
        }
      }
    }

  } catch (e) {
    //Nothing to do...
  }

  return msg;

}

function createWinston(cfg) {
  'use strict';

  var winstonError = false;

  /**
   * This function will be called when an error arises writing a log in a file
   * @param err The error
   * @return {boolean} true (It forces to exit the application -due requirements-)
   */
  function exitOnError(err) {

    var exit = cfg.exitOnError || true,
        logType, logMsg;

    //Logger exceptions related to file transport
    if (err.path === config.File.filename || err.stack.indexOf('/node_modules/winston/') !== -1) {

      if (!winstonError) {
        //User must be noted that file transport cannot be used anymore
        logType = 'warning';
        logMsg = createLogMessage(logType, 'It\'s not possible write to log file. Log messages won\'t be ' +
            'written to log file anymore.', { component: 'logger' });
        winstonLogger[logType](logMsg);
      }

      winstonError = true;

      //Set this variable according to your needs.
      //true = program will exit if messages cannot be written to log file
      //false = program won't exit if messages cannot be written to log file
      exit = config.exitOnLogError || false;

    } else {      //Generic Exceptions

      var component = {};

      //Parse stack
      try {
        var items = stackParser.parse(err.stack);
        component = items[0] || {};
      } catch (e) {
        //Nothing to do...
      }

      //Log message
      logType = 'emerg';
      logMsg = createLogMessage(logType, err.message, { component: component.file, line: component.line });
      winstonLogger[logType](logMsg);


    }

    //Exit (due requirements)
    return exit;
  }

  winstonLogger = new (winston.Logger)({
    level: cfg.logLevel,
    exitOnError: exitOnError
  });

  if (cfg.Console) {
    winstonLogger.add(winston.transports.Console, cfg.Console);
  }

  if (cfg.File) {
    winstonLogger.add(winston.transports.File, cfg.File);
  }

  winstonLogger.setLevels(winston.config.syslog.levels);

}

function setConfig(newCfg) {
  'use strict';

  config = newCfg;

  //Only when Transport File is going to be used.
  if (config.File) {
    config.File.handleExceptions = true;    //Necessary to handle file exceptions
  }

  createWinston(config);

}

function newLogger() {
  'use strict';

  if (winstonLogger === null) {
    createWinston(config);
  }

  var logger = {};

  /**
   *
   * @param level Standard default values (DEBUG, INFO, NOTICE, WARNING, ERROR, CRIT, ALERT, EMERG)
   * @param message Log Message
   * @param logObj An object or an array that will be printed after the message
   * @return {*}
   */
  logger.log = function(level, message, logObj) {

    if (winstonLogger.levels[level] < winstonLogger.levels[config.logLevel]) {
      return;
    }

    var logMessage = createLogMessage.call(this, level, message, logObj).replace(/\n/g, '');

    var tmpLogger = winstonLogger.log(level, logMessage);
    if (config.flushEachMessage && tmpLogger.transports.file && tmpLogger.transports.file._stream) {
      tmpLogger.transports.file.flush();
    }
    return tmpLogger;
  };


  for (var lvl in winston.config.syslog.levels) {
    if (winston.config.syslog.levels.hasOwnProperty(lvl)) {
      logger[lvl] = function _block(aLevel) {
        return function(msg, obj) {
          return logger.log(aLevel, msg, obj);
        };
      }(lvl);
    }
  }
  // socket.io compatibility
  logger.warn = logger.warning;

  /*
   TODO: A log level for every logger? Each module could set its own filtering level
   logger.setLevel = function ...
   */

  return logger;
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
