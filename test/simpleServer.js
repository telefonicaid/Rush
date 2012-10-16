var http = require('http');

var serverListener = function (connectedCallback, dataCallback) {

    var body = '';
    var headers, method;

    var srv = http.createServer(function (req, res) {
        headers = req.headers;
        method = req.method;
        req.on('data', function (chunk) {
            body += chunk;
        });
        srv.on('error', function () {
            dataCallback(null);
        });
        req.on('end', function () {
            res.writeHead(200, headers);
            res.end(body);
            dataCallback(method, headers, body);
            req.destroy();
            srv.close();
        });
        srv.on('close', function () {
            console.log('server Closed');
        });
    }).listen(8014, connectedCallback);

};

exports.serverListener = serverListener;