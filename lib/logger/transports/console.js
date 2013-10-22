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

var Console = exports.Console = function(config) {

  this.timestamp = (config.timestamp === false) ? false : true;
  this.level = config.level || globals.defaultConfig.Console.level;
  this.inspectDepth = config.inspectDepth || globals.defaultConfig.inspectDepth;

};

Console.prototype.log = function(level, message, logObj) {

  var output = common.getLogMessage({
    level: level,
    message: message,
    logObj: logObj,
    timestamp: this.timestamp,
    inspectDepth: this.inspectDepth
  });

  console.log(output);

};





