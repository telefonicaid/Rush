/*
 Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U

 This file is part of PopBox.

 PopBox is free software: you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free
 Software Foundation, either version 3 of the License, or (at your option) any
 later version.
 PopBox is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or
 FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public
 License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with PopBox. If not, seehttp://www.gnu.org/licenses/.

 For those usages not covered by the GNU Affero General Public License
 please contact with::dtc_support@tid.es
 */

//Pool modeled via Connection array
var config = require('./configBase.js');
var redisModule = require('redis');

var path = require('path');
var log = require('PDITCLogger');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

exports.Pool = function Pool(connection) {
  'use strict';
  var maxElems = config.pool.maxElems || 1000;
  var connections = [];
  var currentConnections = 0;

  var pool = {
    get: get,
    free: free
  };
  return pool;

  function get() {
    var con = connections.pop();
    if (con) {
      return con;
    }
    else if (! con && currentConnections < maxElems) {
      //we will create a new connection
      con = connection.db;
      console.log(connection);
      con.select(config.selectedDB);
      con.isOwn = true;
      con.pool = pool; //add pool reference
      currentConnections++;
      con.on('error', function(err) {
        console.log('error - redis', err);
      });
      return con;
    }
    return null;
  }

  function free(con) {
    //get back to the pool
    connections.push(con);
  }
};

require('./hookLogger.js').init(exports.Pool, logger);
