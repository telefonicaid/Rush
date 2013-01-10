var http = require('http');
var should = require('should');
var config = require('./config.js');
var server = require('./simpleServer.js');
var utils = require('./utils.js');

var applicationContent = 'application/json',
    personalHeader1name = 'personal-header-1',
    personalHeader1value = 'TEST1',
    personalHeader2name = 'personal-header-2',
    personalHeader2value = 'TEST2';

var options = {};
options.host = config.rushServer.hostname;
options.port = config.rushServer.port;
options.headers = {};
options.headers['content-type'] = applicationContent;
options.headers[personalHeader1name] = personalHeader1value;
options.headers[personalHeader2name] = personalHeader2value;

var serversToShutDown = [];

function prepareServerAndSendPetition(type, content, httpCallBack, callback) {
    'use strict';
    //Variables
    var relayerhost = 'http://localhost:' + config.simpleServerPort;

    //Start up the server
    var simpleServer = server.serverListener(

        function () {

            //Petition method
            options.method = type;
            options.headers['x-relayer-host'] = relayerhost;
            options.headers['x-relayer-httpcallback'] = httpCallBack;

            utils.makeRequest(options, content, function (err, data) { });

        },

        function (method, headers, contentReceived) {
            //Test method
            method.should.be.equal(type);

            //Test headers
            headers.should.have.property('content-type', applicationContent);
            headers.should.have.property(personalHeader1name, personalHeader1value);
            headers.should.have.property(personalHeader2name, personalHeader2value);

            //Test content
            contentReceived.should.be.equal(content);

            if (callback) {
                callback();
            }
        }
    );

    serversToShutDown.push(simpleServer);

}

function makeRequest(type, content, done) {
    'use strict';
    //Variables
    var portCallBack = config.callBackPort, server_callback;

    //Callback Server
    server_callback = http.createServer(function (req, res) {

        var response = '';

        req.on('data',
            function (chunk) {
                response += chunk;
            });

        req.on('end',
            function () {
                var parsedJSON = JSON.parse(response);
                parsedJSON.should.have.property('body', content);
                parsedJSON.should.have.property('statusCode', 200);

                res.writeHead(200);
                res.end();
                server_callback.close();
                done();
            });

    }).listen(portCallBack, prepareServerAndSendPetition.bind({}, type, content, 'http://localhost:' + portCallBack));

    serversToShutDown.push(server_callback);
}

describe('HTTP_Callback', function () {
    'use strict';
    var content = 'HTTP_Callback Test';

    afterEach(function() {
        for (var i = 0; i < serversToShutDown.length; i++) {
            try {
                serversToShutDown[i].close();
            } catch (e) {

            }
       }

        serversToShutDown = [];
    });

    describe('#POST', function () {

        it('Should receive a callback on a correct POST petition', function (done) {
            makeRequest('POST', content, done);
        })
    });

    describe('#PUT', function () {

        it('Should receive a callback on a correct PUT petition ', function (done) {
            makeRequest('PUT', content, done);
        })
    });

    describe('#GET', function () {

        it('Should receive a callback on a correct GET petition ', function (done) {
            makeRequest('GET', '', done);
        })
    });

    describe('#DELETE', function () {

        it('Should receive a callback on a correct DELETE petition ', function (done) {
            makeRequest('DELETE', '', done);
        })
    });

    describe('Second petition should be completed even if the first callback is incorrect', function () {

        it('Consumer should not die even if the callback is not responding', function (done) {
            prepareServerAndSendPetition('POST', content, 'http://localhost:8888', done);
        })

        it('Should receive a callback even if the callback of the last petition was incorrect', function (done) {
            makeRequest('POST', content, done);
        })
    })

    describe('Callback has to be called even if the Host is incorrect', function () {
        it('Should receive a callback with an error', function (done) {

            var portCallBack = config.callBackPort,
                server_callback,
                relayerHost = 'http://noexiste:1234',
                httpCallBack = 'http://localhost:' + portCallBack;

            //Callback Server
            server_callback = http.createServer(function (req, res) {

                var response = '';

                req.on('data',
                    function (chunk) {
                        response += chunk;
                    });

                req.on('end',
                    function () {

                        var parsedJSON = JSON.parse(response);
                        should.not.exist(parsedJSON.result);

                        parsedJSON.should.have.property('error', 'ENOTFOUND(getaddrinfo)');

                        res.writeHead(200);
                        res.end();
                        server_callback.close();
                        done();
                    });

            }).listen(portCallBack,
                function () {
                    options.method = 'POST';
                    options.headers['X-Relayer-Host'] = relayerHost;
                    options.headers['x-relayer-httpcallback'] = httpCallBack;

                    utils.makeRequest(options, content, function (err, data) { });
                }
            );

            serversToShutDown.push(server_callback);
        })
    });
});