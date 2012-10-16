var should = require('should');
var server = require('./simpleServer.js');
var utils = require('./utils.js');
var http = require('http');

function makeRequest(type, content, done) {
    'use strict';
    //Variables
    var applicationContent = 'application/json',
        relayerPersitence = 'BODY',
        relayerhost = 'http://localhost:8014',
        httpcallback = 'http://localhost:8015',
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
            options.host = 'localhost';
            options.port = '8030';
            options.method = type;
            options.headers = {};
            options.headers['content-type'] = applicationContent;
            options.headers['X-relayer-persistence'] = relayerPersitence;
            options.headers['X-Relayer-Host'] = relayerhost;
            options.headers['x-relayer-httpcallback'] = httpcallback;
            options.headers[personalHeader1name] = personalHeader1value;
            options.headers[personalHeader2name] = personalHeader2value;

            utils.makeRequest(options, content, function (e, data) {
                id = data;
            });
        },

        function (method, headers, contentReceived) {
            method.should.be.equal(type);
            testHeraders(headers);
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
            res.writeHead(200);
            res.end();
            server_callback.close();

            //Check content and headers
            var JSONRes = JSON.parse(response);
            JSONRes.body.should.be.equal(content);

            testHeraders(JSONRes.headers);

            // Check persistence
            var options = { port: 8030, host: 'localhost', path: '/response/' + id, method: 'GET'};
            utils.makeRequest(options, '', function (err, data) {
                var JSONRes = JSON.parse(data);
                JSONRes.body.should.be.equal(content);
                testHeraders(JSON.parse(JSONRes.headers));

                done();
            });

        });
    }).listen(8015);
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
});