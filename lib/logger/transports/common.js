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
var globals = require('../globals.js');

exports.getLogMessage = function(options) {

  'use strict';

  var level = options.level;
  var message = options.message;
  var logObj =  options.logObj || { };

  var msg = '';

  var COMPONENT = 'component', LEVEL = 'level', CORRELATOR = 'correlator', OP = 'op', TRANSID = 'transid';
  var predefinedValues = [ COMPONENT, LEVEL, CORRELATOR, OP, TRANSID ];
  var inspectDepth = globals.defaultConfig.inspectDepth;
  var prefix = '?';
  var hostname = require('os').hostname();

  //Inspect Depth
  if (options.inspectDepth) {
    inspectDepth = options.inspectDepth;
  }

  //Time stamp
  if (options.timestamp) {
    msg += 'time=' + new Date().toISOString();
  }

  //PDI Format
  msg += ' | lvl=' + level.toUpperCase();                                                         //Log level
  msg += ' | op=' + (logObj[OP] ? logObj[OP] : 'DEFAULT');                                        //Op Type
  msg += ' | msg=' + message;                                                                     //User message
  msg += ' | corr=' + (logObj[CORRELATOR] ? logObj[CORRELATOR] : 'N/A');                          //UNICA Correlator
  msg += ' | trans=' + (logObj[TRANSID] ? logObj[TRANSID] : 'N/A');                               //Transaction ID
  msg += ' | hostname=' + hostname;                                                               //Machine
  msg += ' | component=' + (logObj[COMPONENT] ? logObj[COMPONENT] : prefix);                      //Component

  try {

    if (logObj !== null && logObj !== undefined) {

      for (var i in logObj) {
        if(logObj.hasOwnProperty(i)){

          //Values printed previously won't be printed again
          if (predefinedValues.indexOf(i) === -1) {

            msg += ' | ' + i + '=';

            if (util.isArray(logObj[i])) {

              msg += '[';

              //First element
              if (logObj[i].length > 0) {
                msg += util.inspect(logObj[i][0], false, inspectDepth);
              }

              //Remaining elements
              for (var ix = 1; ix < logObj[i].length; ix++) {
                msg += ', ' + util.inspect(logObj[i][ix], false, inspectDepth);
              }

              msg += ']';


            } else {
              msg += util.inspect(logObj[i], false, inspectDepth);
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