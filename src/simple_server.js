var http = require('http');
var https = require('https');

// Create an HTTP server
var srv = http.createServer(function (req, res) {
    req.on('data', function (data) {
        console.log(""+data);
    });
    req.on('end', function() {
        setTimeout( function() {
            res.writeHead(202, {'Content-Type': 'text/plain'});
            res.end('okay');
        }, 2*1000);
    });
});

// now that server is running
srv.listen(8124);

