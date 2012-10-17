var http = require('http');
var should = require('should');
var config = require('./config.js');
var server = require('./simpleServer.js');
var utils = require('./utils.js');


function makeRequest(type, content, done, httpCallbackPort) {
    'use strict';
    //Variables
    var applicationContent = 'application/json',
        relayerPersitence = 'BODY',
        relayerhost = 'http://localhost:' + config.simpleServerPort,
        httpcallback = 'http://localhost:' + (httpCallbackPort || config.callBackPort),
        personalHeader1name = 'personal-header-1',
        personalHeader1value = 'TEST1',
        personalHeader2name = 'personal-header-2',
        personalHeader2value = 'TEST2',
        server_callback, id;

    function testHeraders (headers) {
        headers.should.have.property('content-type', applicationContent);
        headers.should.have.property('x-relayer-host', relayerhost);
        headers.should.have.property('x-relayer-httpcallback', httpcallback);
        headers.should.have.property(personalHeader1name, personalHeader1value);
        headers.should.have.property(personalHeader2name, personalHeader2value);
    }

    //Start up the server
    server.serverListener(

        function () {

            //Petition method
            var options = {};
            options.host = config.rushServer.hostname;
            options.port = config.rushServer.port;
            options.method = type;
            options.headers = {};
            options.headers['content-type'] = applicationContent;
            options.headers['x-relayer-persistence'] = relayerPersitence;
            options.headers['x-relayer-host'] = relayerhost;
            options.headers['x-relayer-httpcallback'] = httpcallback;
            options.headers[personalHeader1name] = personalHeader1value;
            options.headers[personalHeader2name] = personalHeader2value;

            utils.makeRequest(options, content, function (e, data) {
                id = JSON.parse(data).id;
            });
        },

        function (method, headers, contentReceived) {
            method.should.be.equal(type);
            testHeraders(headers);
            contentReceived.should.be.equal(content);

            if (httpCallbackPort && httpCallbackPort !== config.callBackPort) {
                done();
            }
        }
    );

    //Callback Server
    if (!httpCallbackPort || (httpCallbackPort && httpCallbackPort === config.callBackPort)) {
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
                JSONRes.result.body.should.be.equal(content);

                testHeraders(JSONRes.result.headers);

                // Check persistence
                var options = { port: config.rushServer.port, host: 'localhost', path: '/response/' + id, method: 'GET'};
                utils.makeRequest(options, '', function (err, data) {
                    var JSONRes = JSON.parse(data);
                    JSONRes.body.should.be.equal(content);
                    testHeraders(JSON.parse(JSONRes.headers));

                    done();
                });

            });
        }).listen(config.callBackPort);
    }
}

describe('Persistence_HTTPCallback', function () {
    'use strict';
    var content = 'Persistence&HTTPCallBack Test';

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

    describe('#DELETE', function () {

        it('Should ', function (done) {
            makeRequest('DELETE', '', done);
        })
    })

    describe('Second petition should be completed even if the first callback is incorrect', function () {

        it('CallBack Incorrect', function (done) {
            makeRequest('POST', content, done, 8888);
        })

        it('CallBack Correct', function (done) {
            makeRequest('POST', content, done);
        })
    })
});