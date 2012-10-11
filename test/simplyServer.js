
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
            dataCallback(headers,body);
            setTimeout(function(){
                req.destroy();
                srv.close();
            },1000);
        });
        srv.on('close',function(){
            console.log('server Closed');
        });
    }).listen(8014);

    srv.on('connection',connectedCallback);
};

exports.serverListener = serverListener;