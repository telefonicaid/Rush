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

exports.defaultConfig = {

  logLevel: 'debug',  //Log level to use if the transport haven't got an specific log level
  inspectDepth: 2,    //How many times to recurse while formatting the log objects

  //Console transport
  Console: {
    level: 'debug',
    timestamp: true
  },

  //File transport
  File: {
    level: 'debug',
    filename: 'pditclogger.log',
    timestamp: true,
    rounds : 1000,
    exitOnWriteError: true,
    numLogWorkers: 2
  }
};