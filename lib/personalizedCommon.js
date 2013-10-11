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

var util = require('util'),
    cycle = require('cycle');

var config = require('../node_modules/winston/lib/winston/config.js');
var common = require('../node_modules/winston/lib/winston/common.js');

common.log = function(options) {
  'use strict';

  var timestampFn = typeof options.timestamp === 'function' ? options.timestamp : common.timestamp,
      timestamp = options.timestamp ? timestampFn() : null,
      meta = options.meta ? common.clone(cycle.decycle(options.meta)) : null,
      output;

  //
  // raw mode is intended for outputing winston as streaming JSON to STDOUT
  //
  if (options.raw) {
    if (typeof meta !== 'object' && meta !== null) {
      meta = { meta: meta };
    }
    output = common.clone(meta) || {};
    output.level = options.level;
    output.message = options.message.stripColors;
    return JSON.stringify(output);
  }

  //
  // json mode is intended for pretty printing multi-line json to the terminal
  //
  if (options.json) {
    if (typeof meta !== 'object' && meta !== null) {
      meta = { meta: meta };
    }

    output = common.clone(meta) || {};
    output.level = options.level;
    output.message = options.message;

    if (timestamp) {
      output.timestamp = timestamp;
    }

    if (typeof options.stringify === 'function') {
      return options.stringify(output);
    }

    return JSON.stringify(output, function(key, value) {
      return value instanceof Buffer ? value.toString('base64') : value;
    });
  }

  output = timestamp ? 'time=' + timestamp : '';
  //output += options.colorize ? config.colorize(options.level) : options.level;
  output += options.message;

  if (meta) {
    if (typeof meta !== 'object') {
      output += ' ' + meta;
    }
    else if (Object.keys(meta).length > 0) {
      output += ' ' + (options.prettyPrint ? ('\n' + util.inspect(meta, false, null, options.colorize)) :
          common.serialize(meta));
    }
  }

  return output;
};
