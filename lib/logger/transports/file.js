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


var globals = require('../globals.js');
var common = require('./common.js');
var cp = require('child_process');

var File = exports.File = function(config) {

  this.timestamp = config.timestamp || false;
  this.level = config.level || globals.defaultConfig.File.level;
  this.inspectDepth = config.inspectDepth || globals.defaultConfig.inspectDepth;
  this.filename = config.filename || globals.defaultConfig.File.filename;
  this.rounds = config.rounds || globals.defaultConfig.File.rounds;

  //Set exitOnWriteError attribute properly
  if (config.exitOnWriteError !== undefined) {
    this.exitOnWriteError = config.exitOnWriteError;
  } else {
    this.exitOnWriteError = globals.defaultConfig.File.exitOnWriteError;
  }

  this.childs = [];
  var self = this;

  for(var i = 0; i < globals.numLogWorkers; i++){

    //Create child
    var child = cp.spawn('node', [__dirname + '/copyback.js', this.filename],
        {detached: true, stdio : [null, process.stdout, process.stderr, 'ipc']});

    this.childs.push(child);  //Push child

    //On write error
    child.on('message', function(err){

      this.disconnect();
      self.childs.splice(self.childs.indexOf(child), 1); //Remove child

      function writeConsoleErr(level, message) {
        var output = common.getLogMessage({
          level: level,
          message: message,
          timestamp: self.timestamp
        });
        console.error(output);
      }

      if (self.childs.length === 0 && self.exitOnWriteError) {
        writeConsoleErr('EMERG', 'File transport error. Program will exit. Error: ' + err);
        process.exit();
      } else {
        writeConsoleErr('WARN', 'Logger will continue without writing on the specified file. Error: ' + err);
      }
    });
  }

  this.counter = 0;
  this.elected = 0;

};

File.prototype.log = function(level, message, logObj) {

  var output = common.getLogMessage({
    level: level,
    message: message,
    logObj: logObj,
    timestamp: this.timestamp,
    inspectDepth: this.inspectDepth
  }) + '\n';

  if (this.childs.length >= 1) {
    if ((this.counter = (this.counter + 1) % this.rounds) === 0){
      this.elected = (this.elected + 1) % this.childs.length;
    }

    this.childs[this.elected].stdin.write(output);
  }
};
