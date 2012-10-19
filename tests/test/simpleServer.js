var http = require('http');
var config = require('./config');

var serverListener = function (connectedCallback, dataCallback) {

    var srv = http.createServer(function (req, res) {
        var content = '', headers = req.headers, method = req.method;

        req.on('data', function (chunk) {
            content += chunk;
        });

        srv.on('error', function () {
            dataCallback(null);
        });

        req.on('end', function () {
            res.writeHead(200, headers);
            res.end(content);

            dataCallback(method, headers, content);

            req.destroy();
            srv.close();
        });

        //srv.on('close', function () {
        //    console.log('Server closed...');
        //});
    }).listen(config.simpleServerPort, connectedCallback);

};

exports.serverListener = serverListener;