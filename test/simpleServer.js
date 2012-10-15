var http = require('http');

var serverListener = function (connectedCallback, dataCallback) {

    var body = '';
    var headers;

    var srv = http.createServer(function (req, res) {
        headers = req.headers;
        req.on('data', function (chunk) {
            body += chunk;
        });
        srv.on('error', function () {
            callback(false);
        });
        req.on('end', function () {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end(body);
            dataCallback(headers, body);
            req.destroy();
            srv.close();
        });
        srv.on('close', function () {
            console.log('server Closed');
        });
    }).listen(8014, connectedCallback);

};

exports.serverListener = serverListener;