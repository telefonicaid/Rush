/*
var https = require('https');
var http = require('http');
var path = require('path');

var fs = require('fs');
var config = require('./config.js');

var options = {
	key: fs.readFileSync(path.resolve(__dirname, 'serverCert.key')),
	cert: fs.readFileSync(path.resolve(__dirname, 'serverCert.crt'))
};

https.createServer(options,function (req, res) {
	var content = '', headers = req.headers, method = req.method, url = req.url;
  console.log(req.method, req.url, req.headers);
  req.on('data', function (d) {
    console.log('DATA', ''+d);
  });
  req.on('end', function () {
	  res.writeHead(200, headers);
    res.end("Request accepted\n");
  })
}).listen(8001);
*/
// -----------
var path = require('path');
var https = require('https');
var config = require('./config');
var fs = require('fs');


var options = {
	key: fs.readFileSync(path.resolve(__dirname, 'serverCert.key')),
	cert: fs.readFileSync(path.resolve(__dirname, 'serverCert.crt'))
};

var serverListener = function(connectedCallback, dataCallback) {

	var srv = https.createServer(options,function (req, res) {
			var content = '', headers = req.headers, method = req.method, url = req.url;

			console.log(req.method, req.url, req.headers);
			req.on('data', function (chunck) {
				content += chunk;
			//console.log('DATA', ''+chunk);
		});
			srv.on('error', function() {
				dataCallback(null);
			});

			req.on('end', function() {
				res.writeHead(200, headers);
				//res.end("Request accepted\n");
				dataCallback(method, headers, url, content);
				srv.close();
			});
		}).listen(config.simpleServerPort, connectedCallback);
	return srv;

};

exports.serverListener = serverListener;


