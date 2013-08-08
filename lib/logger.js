//
// Copyright (c) Telefonica I+D. PDI  All rights reserved.
//
//

/*
 * Since Winston has a predefined log style define in 'common' module, it's necessary to modify this module
 * in order to accomplish TID Log Style guide. 'personalizedCommon.js' modifies that module and it's necessary
 * to be required even if not used.
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
    level: 'debug', timestamp: true
  },
  File: {
    //FIXME: Filename should be changed to meet PID requirements
    level: 'debug', filename: 'pditclogger.log', timestamp: true, json: false
  }
};

function createLogMessage(level, message, logObj) {

  var msg = '';

  var COMPONENT = 'component', LEVEL = 'level', CORRELATOR = 'correlator', OP = 'op', TRANSID = 'transid';
  var predefinedValues = [ COMPONENT, LEVEL, CORRELATOR, OP, TRANSID ];

  //Set default value
  logObj = logObj || {};

  //PDI Format
  msg += ' | lvl=' + level.toUpperCase();                                                          //Log level
  msg += ' | op=' + (logObj[OP] ? logObj[OP] : 'DEFAULT');                                        //Op Type
  msg += ' | msg=' + message;                                                                     //User message
  msg += ' | corr=' + (logObj[CORRELATOR] ? logObj[CORRELATOR] : 'N/A');                    //UNICA Correlator
  msg += ' | trans=' + (logObj[TRANSID] ? logObj[TRANSID] : 'N/A');                             //Transaction ID
  msg += ' | hostname=' + os.hostname();                                                          //Machine
  msg += ' | component=' + (logObj[COMPONENT] ? logObj[COMPONENT] : (this.prefix ? this.prefix : '?'));  //Component

  try {

    if (logObj !== null && logObj !== undefined) {

      if (util.isArray(logObj)) {
        msg += ' | Array=';
        if (logObj.length > 0) {
          msg += util.inspect(logObj[0], false, config.inspectDepth);
        }
        for (var ix = 1; ix < logObj.length; ix++) {
          msg += ', ' + util.inspect(logObj[ix], false, config.inspectDepth);
        }

      } else {
        for (var i in logObj) {
          if (predefinedValues.indexOf(i) === -1) {
            msg += ' | ' + i + '=' + util.inspect(logObj[i], false, config.inspectDepth);
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
  "use strict";

  /**
   * This function will be called when an error arises writing a log in a file
   * @param err The error
   * @returns {boolean} true (It forces to exit the application -due requirements-)
   */
  function exitOnError(err) {

    var component = null, component2;

    try {
      var items = stackParser.parse(err.stack);
      //component = items[0].file + ':' + items[0].line + ':' + items[0].column;
      component = items[0].file;
    } catch(e) {
      //Nothing to do...
    }

    var logMsg = createLogMessage('emerg',JSON.stringify(items), { component: component });

    //Use critical Winston to print the message
    winstonLogger.emerg(logMsg);

    //Exit (due requirements)
    return cfg.exitOnError || true;
  }

  winstonLogger = new (winston.Logger)({
    level: cfg.logLevel,
    exitOnError: exitOnError,
    transports: [
      new (winston.transports.Console)(cfg.Console),
      new (winston.transports.File)(cfg.File)
    ]
  });

  winstonLogger.setLevels(winston.config.syslog.levels);

}

function setConfig(newCfg) {
  "use strict";

  config = newCfg;
  config.File.handleExceptions = true;    //Necessary to handle file exceptions
  createWinston(config);

}

function newLogger() {
  "use strict";

  if (winstonLogger === null) {
    createWinston(config);
  }

  var logger = {};

  /**
   *
   * @param level Standard default values (DEBUG, INFO, NOTICE, WARNING, ERROR, CRIT, ALERT, EMERG)
   * @param message Log Message
   * @param logObj An object or an array that will be printed after the message
   * @returns {*}
   */
  logger.log = function (level, message, logObj) {

    if (winstonLogger.levels[level] < winstonLogger.levels[config.logLevel]) {
      return;
    }

    var message = createLogMessage.call(this, level, message, logObj).replace(/\n/g, '');

    return winstonLogger.log(level, message);
  };


  for (var lvl in winston.config.syslog.levels) {
    if (winston.config.syslog.levels.hasOwnProperty(lvl)) {
      logger[lvl] = function _block(aLevel) {
        return function (msg, obj) {
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
 Events that are unusual but not error conditions - might be summarized in an email to developers or admins to spot potential problems - no immediate action required
 WARNING:
 Warning messages - not an error, but indication that an error will occur if action is not taken, e.g. file system 85% full - each item must be resolved within a given time
 ERROR:
 Non-urgent failures - these should be relayed to developers or admins; each item must be resolved within a given time
 ALERT:
 Should be corrected immediately - notify staff who can fix the problem - example is loss of backup ISP connection
 CRITICAL:
 Should be corrected immediately, but indicates failure in a primary system - fix CRITICAL problems before ALERT - example is loss of primary ISP connection
 EMERGENCY:
 A "panic" condition - notify all tech staff on call? (earthquake? tornado?) - affects multiple apps/servers/sites...



 */
