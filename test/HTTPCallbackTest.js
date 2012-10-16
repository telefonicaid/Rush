var should = require('should');
var server = require('./simpleServer.js');
var utils = require('./utils.js');
var http = require('http');

function makeRequest(type, content, done) {
    'use strict';
    //Variables
    var applicationContent = 'application/json',
        relayerhost = 'http://localhost:8014',
        httpcallback = 'http://localhost:8015',
        server_callback;

    //Start up the server
    server.serverListener(

        function () {

            //Petition method
            var options = {};
            options.host = 'localhost';
            options.port = '8030';
            options.method = type;
            options.headers = {};
            options.headers['content-type'] = applicationContent;
            options.headers['X-Relayer-Host'] = relayerhost;
            options.headers['x-relayer-httpcallback'] = httpcallback;

            utils.makeRequest(options, content, function (e, data) {
                //console.log(e);
                //console.log(data);
            });

        },

        function (method, headers, contentReceived) {
            //Test method
            method.should.be.equal(type);

            //Test headers
            headers['content-type'].should.be.equal(applicationContent);
            headers['x-relayer-host'].should.be.equal(relayerhost);
            headers['x-relayer-httpcallback'].should.be.equal(httpcallback);

            //Test content
            contentReceived.should.be.equal(content);
        }
    );

    //Callback Server
    server_callback = http.createServer(function (req, res) {

        var response = '';

        req.on('data',
            function (chunk) {
                response += chunk;
            });

        req.on('end', function () {
            JSON.parse(response).body.should.be.equal(content);
            res.writeHead(200);
            res.end();
            server_callback.close();
            done();
        });

    }).listen(8015);
}

describe('HTTP_Callback', function () {
    'use strict';
    var content = 'HTTP_Callback Test';

    describe('#POST', function () {

        it('Should ', function (done) {
            makeRequest('POST', content, done);
        })
    });

    describe('#PUT', function () {

        it('Should ', function (done) {
            makeRequest('PUT', content, done);
        })
    });

    describe('#GET', function () {

        it('Should ', function (done) {
            makeRequest('GET', '', done);
        })
    });
});