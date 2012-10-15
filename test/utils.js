http = require('http');

var postObj = function (options, content, cb) {
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

};

postObj.exports = postObj;