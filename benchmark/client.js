var http = require('http');
var server = require('./server.js');

var client = function (rushHost, rushPort, hostAndPort, ended) {
    'use strict';

    var options = {};
    options.host = rushHost;
    options.port = rushPort;
    options.headers = {};
    options.headers['X-Relayer-Host'] = hostAndPort;
    //options.headers['X-relayer-persistence'] = 'BODY';
    options.method = 'POST';

    var req = http.request(options, function (res) {

        /*var data = '';

        res.on('data', function (chunk) {
            data += chunk;
        });*/

        if(ended && typeof(ended)==='function'){
            res.on('end', ended);
        }
    });

    req.end();
};

exports.client = client;