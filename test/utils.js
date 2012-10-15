http = require('http');

function postObj(options, content, cb) {
    'use strict';
    var data = '';

    var req = http.request(options, function (res) {

        var o; //returned object from request
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            data += chunk;
            console.log('data ' + data);
        });
        res.on('end', function () {
            console.log('end ' + data);
            cb();
        });
    });

    req.on('error', function (e) {
        cb(e);
    });
    if (options.method === 'POST' || options.method === 'PUT') {
        req.write(JSON.stringify(content));
    }

    req.end();

}


// Ejemplo de options
var options = {};
options.host = 'localhost';
options.port = '8030';
options.method = 'GET';
options.headers = {};
options.headers['content-type'] = 'application/json';
options.headers['X-Relayer-Host'] = 'http://www.google.es/';
options.headers['X-relayer-persistence'] = 'BODY';

postObj(options, 'body', function (e) {
    if (!e) {
        console.log('finished');
    }
    console.log(e);
    console.log('Callback\n')
})