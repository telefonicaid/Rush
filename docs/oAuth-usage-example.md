This in an example of a request to Twitter API with with OAuth authentication:
```
var util = require('util');
var http = require('http');
var oauth = require('oauth-client');

var consumer = oauth.createConsumer('[your consumer key]', '[your consumer secret]');
var token = oauth.createToken('[token key]', '[token secret]');
var signer = oauth.createHmac(consumer, token);

var options = {
    "port":3001,
    "host":"localhost",
    "path":"/",
    "method":"GET",
    "headers":{
        "X-relayer-persistence":"BODY",
        "X-Relayer-Host":"https://api.twitter.com:443/1.1/statuses/mentions_timeline.json"
    }
};

//  fillURL = function(path, host, port, https)
var uri = oauth.fillURL("/1.1/statuses/mentions_timeline.json", "api.twitter.com", 443, true);

options.headers.autorization = oauth.signRequest(options.method, uri, options.headers, options.body, signer).authorization;

var req = http.request(options, function (res) {
    res.on('data', function (chunk) {
        console.log(chunk.toString());
    });
});
req.end();
```