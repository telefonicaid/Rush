//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

//
// Simple substitute for a real logging
//

var util = require('util')
var winston = require('winston')

var myWinston = new (winston.Logger)({
    transports:[
        new (winston.transports.Console)({ level: 'debug',  timestamp:true}),
        new (winston.transports.File)({ level: 'debug', filename:'somefile.log', timestamp:true , json: false})
    ]
});

myWinston.setLevels(winston.config.syslog.levels);

function newLogger() {
    var logger = {};
    logger.log = function (loglevel, msg, obj) {
        "use strict";
        try {
            var prefix = this.prefix === undefined ? '' : '[' + this.prefix + '] ';


                msg += ' ' + JSON.stringify(obj);


            return myWinston.log(loglevel, prefix + msg);
        }
        catch (e) {
            console.log(e);
        }
    }

    for (var level in winston.config.syslog.levels) {

        logger[level] = function (level) {
            return function (msg, obj) {
                return this.log(level, msg, obj);
            }
        }(level);
    }

    return logger;
}


exports.newLogger = newLogger;



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

