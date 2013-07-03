//Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U
//
//This file is part of RUSH.
//
//  RUSH is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//  RUSH is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
//
//  You should have received a copy of the GNU Affero General Public License along with RUSH
//  . If not, seehttp://www.gnu.org/licenses/.
//
//For those usages not covered by the GNU Affero General Public License please contact with::dtc_support@tid.es

var http = require('http');
var https = require('https');

// Create an HTTP server
var srv = http.createServer(function(req, res) {
  'use strict';

  req.on('data', function(data) {
    console.log('(CB):' + data);
  });
  req.on('end', function() {
    setTimeout(function() {
      res.writeHead(201, {'Content-Type': 'text/plain'});
      res.end('okay');
    }, 2 * 1000);
  });
});

// now that server is running
srv.listen(8124);

var srv2 = http.createServer(function(req, res) {
  'use strict';

  req.on('data', function(data) {
    console.log('(ERROR CB):' + data);
  });
  req.on('end', function() {
    setTimeout(function() {
      res.writeHead(202, {'Content-Type': 'text/plain'});
      res.end('okay');
    }, 2 * 1000);
  });
});

// now that server is running
srv2.listen(8125);

var srv3 = http.createServer(function(req, res) {
  'use strict';

  req.on('data', function(data) {
    console.log('(ERROR CB):' + data);
  });
  req.on('end', function() {
    setTimeout(function() {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('fallo mortal');
    }, 2 * 1000);
  });
});

// now that server is running
srv3.listen(8126);
