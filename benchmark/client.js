var http = require('http');
var server = require('./server.js');

var client = function (rushHost, rushPort, hostAndPort) {
    'use strict';

    var options = {};
    options.host = rushHost;
    options.port = rushPort;
    options.headers = {};
    options.headers['X-Relayer-Host'] = hostAndPort;
    //options.headers['X-relayer-persistence'] = 'BODY';
    options.method = 'POST';

    var req = http.request(options, function (res) {

        res.on('data', function (chunk) {
            var data = '';
            data += chunk;
            console.log(data);
        });
    });

    /*var body = { timeout:timeout, resSize:resSize};
    body = JSON.stringify(body);
    req.write(body);*/
    req.end();
};

exports.client = client;