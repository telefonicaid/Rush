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

  var N_A = 'N/A';
  var COMPONENT = 'component', LEVEL = 'level', CORRELATOR = 'correlator', OP = 'op', TRANSID = 'transid';
  var predefinedValues = [ COMPONENT, LEVEL, CORRELATOR, OP, TRANSID, globals.force ];
  var inspectDepth = globals.defaultConfig.inspectDepth;
  var prefix = N_A;
  var hostname = require('os').hostname();

  //Inspect Depth
  if (options.inspectDepth) {
    inspectDepth = options.inspectDepth;
  }

  //Time stamp
  if (options.timestamp) {
    msg += 'time=' + new Date().toISOString() + ' | ';
  }

  //Component left in blank
  if (logObj[COMPONENT] === '') {
    logObj[COMPONENT] = N_A;
  }

  //PDI Format
  msg += 'lvl=' + level.toUpperCase();                                                            //Log level
  msg += ' | op=' + (logObj[OP] ? logObj[OP] : N_A);                                              //Op Type
  msg += ' | msg=' + (message ? message : N_A);                                                   //User message
  msg += ' | corr=' + (logObj[CORRELATOR] ? logObj[CORRELATOR] : N_A);                            //UNICA Correlator
  msg += ' | trans=' + (logObj[TRANSID] ? logObj[TRANSID] : N_A);                                 //Transaction ID
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

              for (var ix = 0; ix < logObj[i].length; ix++) {
                msg += util.inspect(logObj[i][ix], false, inspectDepth);
                msg += (ix === logObj[i].length - 1) ? '' : ', ';  //Commas are used to split array elements
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

  //Avoid line feeds
  msg = msg.replace(new RegExp('\n', 'g'), '');

  return msg;

}