var http = require('http');
var should = require('should');
var config = require('./config.js');
var server = require('./simpleServer.js');
var utils = require('./utils.js');

var applicationContent = 'application/json',
    relayerHost = 'http://localhost:' + config.simpleServerPort,
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

function testHeraders (headers) {
    headers.should.have.property('content-type', applicationContent);
    headers.should.have.property(personalHeader1name, personalHeader1value);
    headers.should.have.property(personalHeader2name, personalHeader2value);
}


function makeRequest(type, persistence, content, done) {
    'use strict';

    //Variables
    var httpcallback = 'http://localhost:' + config.callBackPort,
        server_callback, id;

    //Callback Server
    server_callback = http.createServer(function (req, res) {

        var response = '';

        req.on('data',
            function (chunk) {
                response += chunk;
            });

        req.on('end', function () {
            res.writeHead(200);
            res.end();
            server_callback.close();

            //Check content and headers
            var JSONRes = JSON.parse(response);
            JSONRes.should.have.property('body');
            JSONRes.body.should.be.equal(content);

            JSONRes.should.have.property('headers');
            testHeraders(JSONRes.headers);

            // Check persistence
            setTimeout(function() {

                var options = { port: config.rushServer.port, host: 'localhost', path: '/response/' + id, method: 'GET'};

                utils.makeRequest(options, '', function (err, data) {

                    should.not.exist(err);
                    should.exist(data);
                    var JSONRes = JSON.parse(data);

                    if (persistence === 'BODY') {

                        JSONRes.should.have.property('body');
                        JSONRes.body.should.be.equal(content);
                        testHeraders(JSONRes.headers);
                        JSONRes.should.have.property('statusCode', '200');

                    } else if (persistence === 'HEADER') {


                        JSONRes.should.not.have.property('body');
                        JSONRes.should.have.property('headers');
                        testHeraders(JSONRes.headers);
                        JSONRes.should.have.property('statusCode', '200');

                    } else if (persistence === 'STATUS') {

                        JSONRes.should.not.have.property('body');
                        JSONRes.should.not.have.property('headers');
                        JSONRes.should.have.property('statusCode', '200');

                    }

                    done();
                });
            }, 2000);   //Wait prudential time until the persistence is completed

        });
    }).listen(config.callBackPort,

        //The petition will executed once the callback server and the target server are up
        function() {

            //Start up the server
            var simpleServer = server.serverListener(

                function () {

                    //Make request
                    options.method = type;
                    options.headers['x-relayer-persistence'] = persistence;
                    options.headers['x-relayer-host'] = relayerHost;
                    options.headers['x-relayer-httpcallback'] = httpcallback;

                    utils.makeRequest(options, content, function (e, data) {
                        id = JSON.parse(data).id;
                    });
                },

                function (method, headers, contentReceived) {
                    method.should.be.equal(type);
                    testHeraders(headers);
                    contentReceived.should.be.equal(content);
                }
            );

            serversToShutDown.push(server_callback);
    });

    serversToShutDown.push(server_callback);
}

describe('Persistence_HTTPCallback', function () {
    'use strict';
    var content = 'Persistence&HTTPCallBack Test';

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

        it('Persistence: BODY', function (done) {
            this.timeout(3000);
            makeRequest('POST', 'BODY', content, done);
        });

        it('Persistence: HEADER', function (done) {
            this.timeout(3000);
            makeRequest('POST', 'HEADER', content, done);
        });

        it('Persistence: STATUS', function (done) {
            this.timeout(3000);
            makeRequest('POST', 'STATUS', content, done);
        });
    });

    describe('#PUT', function () {

        it('Persistence: BODY', function (done) {
            this.timeout(3000);
            makeRequest('PUT', 'BODY', content, done);
        });

        it('Persistence: HEADER', function (done) {
            this.timeout(3000);
            makeRequest('PUT', 'HEADER', content, done);
        });

        it('Persistence: STATUS', function (done) {
            this.timeout(3000);
            makeRequest('PUT', 'STATUS', content, done);
        });
    });

    describe('#GET', function () {

        it('Persistence: BODY', function (done) {
            this.timeout(3000);
            makeRequest('GET', 'BODY', '', done);
        });

        it('Persistence: HEADER', function (done) {
            this.timeout(3000);
            makeRequest('GET', 'HEADER', '', done);
        });

        it('Persistence: STATUS', function (done) {
            this.timeout(3000);
            makeRequest('GET', 'STATUS', '', done);
        });
    });

    describe('#DELETE', function () {

        it('Persistence: BODY', function (done) {
            this.timeout(3000);
            makeRequest('DELETE', 'BODY', '', done);
        });

        it('Persistence: HEADER', function (done) {
            this.timeout(3000);
            makeRequest('DELETE', 'HEADER', '', done);
        });

        it('Persistence: STATUS', function (done) {
            this.timeout(3000);
            makeRequest('DELETE', 'STATUS', '', done);
        });
    })

    describe('Second petition should be completed even if the first callback is incorrect', function () {

        it('CallBack Incorrect', function (done) {

            var id, type = 'POST', httpCallBack = 'http://noexiste:2222';

            var simpleServer = server.serverListener(

                function () {

                    //Petition method
                    options.method = type;
                    options.headers['x-relayer-persistence'] = 'BODY';
                    options.headers['x-relayer-host'] = relayerHost;
                    options.headers['x-relayer-httpcallback'] = httpCallBack;

                    utils.makeRequest(options, content, function (e, data) {
                        id = JSON.parse(data).id;
                    });
                },

                function (method, headers, contentReceived) {
                    method.should.be.equal(type);
                    testHeraders(headers);
                    contentReceived.should.be.equal(content);

                    setTimeout(
                        function () {
                            var options = { port: 3001, host: 'localhost', path: '/response/' + id, method: 'GET'};
                            utils.makeRequest(options, '', function (err, data) {

                                var JSONRes = JSON.parse(data);

                                JSONRes.body.should.be.equal(content);
                                testHeraders(JSONRes.headers);

                                JSONRes.should.have.property('statusCode', '200');
                                JSONRes.should.have.property('callback_err', 'ENOTFOUND(getaddrinfo)');

                                done();
                            });
                        }
                    , 1000); //Wait for callback to be completed
                }
            );

            serversToShutDown.push(simpleServer);

        });


        it('CallBack Correct', function (done) {
            this.timeout(3000);
            makeRequest('POST', 'BODY', content, done);
        });
    })

    describe('Callback has to be called even if the Host is incorrect', function() {
        it ('Should receive a callback with an error', function (done) {

            var portCallBack = config.callBackPort,
                server_callback,
                relayerHost = 'http://noexiste:1234',
                httpCallBack = 'http://localhost:' + portCallBack, id;

            //Callback Server
            var server_callback = http.createServer(function (req, res) {

                var response = '';

                req.on('data',
                    function (chunk) {
                        response += chunk;
                    });

                req.on('end',
                    function () {

                        var parsedJSON = JSON.parse(response);
                        should.not.exist(parsedJSON.result);

                        //Test content
                        parsedJSON.should.have.property('error', 'ENOTFOUND(getaddrinfo)');

                        res.writeHead(200);
                        res.end();
                        server_callback.close();

                        var options = { port: config.rushServer.port, host: 'localhost', path: '/response/' + id, method: 'GET'};
                        setTimeout(function () {
                            utils.makeRequest(options, '', function (err, data) {
                                var JSONparsed = JSON.parse(data);
                                JSONparsed.should.have.property('error', 'ENOTFOUND(getaddrinfo)');
                                JSONparsed.should.have.property('callback_status', '200');
                                done();
                            });
                        }, 30);

                    });
            }).listen(portCallBack,
                function () {
                    //Petition method
                    options.method = 'POST';
                    options.headers['x-relayer-host'] = 'BODY';
                    options.headers['X-Relayer-Host'] = relayerHost;
                    options.headers['x-relayer-httpcallback'] = httpCallBack;

                    utils.makeRequest(options, content,
                        function (err, data) {
                            id = JSON.parse(data).id;
                        }
                    );
                }
            );

            serversToShutDown.push(server_callback);
        });
    });
});