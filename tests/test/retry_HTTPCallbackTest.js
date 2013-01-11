var http = require('http');
var should = require('should');
var config = require('./config.js');
var utils = require('./utils.js');

var serversToShutDown = [];

function runTest(retryTimes, petitionCorrect, serverTimes, done) {

    var CONTENT = 'Retry Test',
        APPLICATION_CONTENT = 'application/json',
        RELAYER_HOST = 'http://localhost:' + config.simpleServerPort,
        PERSONAL_HEADER_1_NAME = 'personal-header-1',
        PERSONAL_HEADER_1_VALUE = 'TEST1',
        PERSONAL_HEADER_2_NAME = 'personal-header-2',
        PERSONAL_HEADER_2_VALUE = 'TEST2',
        RELAYER_CALLBACK = 'http://localhost:' + config.callBackPort,
        petitionsReceived = 0,
        targetServer, callbackServer;

    function makeRequest(retryTimes) {

        //Petition method
        var options = {};
        options.host = config.rushServer.hostname;
        options.port = config.rushServer.port;
        options.method = 'POST';
        options.headers = {};
        options.headers['content-type'] = APPLICATION_CONTENT;
        options.headers['X-Relayer-Host'] = RELAYER_HOST;
        options.headers['X-relayer-retry'] = retryTimes;
        options.headers['x-relayer-httpcallback'] = RELAYER_CALLBACK;
        options.headers[PERSONAL_HEADER_1_NAME] = PERSONAL_HEADER_1_VALUE;
        options.headers[PERSONAL_HEADER_2_NAME] = PERSONAL_HEADER_2_VALUE;

        utils.makeRequest(options, CONTENT, function (e, data) { });
    }

    function launchServerAndPetition() {
        var targetServer = http.createServer(function (req, res) {

            var headers = req.headers,
                method = req.method,
                contentReceived = '';

            req.on('data', function (chunk) {
                contentReceived += chunk;
            });

            req.on('end', function () {

                petitionsReceived += 1;

                if (petitionsReceived === petitionCorrect) {
                    res.writeHead(200, headers);
                } else {
                    res.writeHead(500, headers);
                }

                res.end(contentReceived);
                req.destroy();

                //Test petition
                method.should.be.equal('POST');
                headers['content-type'].should.be.equal(APPLICATION_CONTENT);
                contentReceived.should.be.equal(CONTENT);

                if (petitionsReceived === serverTimes) {
                    targetServer.close();
                }
            });
        }).listen(config.simpleServerPort, makeRequest.bind({}, retryTimes));

        serversToShutDown.push(targetServer);
    }

    callbackServer = http.createServer(function (req, res) {

        var response = '';

        req.on('data',
            function (chunk) {
                response += chunk;
            });

        req.on('end', function () {

            var parsedJSON, headers, body;

            if (petitionCorrect > serverTimes) {
                parsedJSON = JSON.parse(response);

                parsedJSON.should.have.property('error', 'Not relayed request 500');
                parsedJSON.should.have.property('statusCode', 500);

                parsedJSON.should.have.property('headers');
                parsedJSON.should.have.property('body');
                headers = parsedJSON.headers;
                body = parsedJSON.body;

            } else {

                parsedJSON = JSON.parse(response);

                parsedJSON.should.have.property('statusCode', 200);
                parsedJSON.should.have.property('headers');
                parsedJSON.should.have.property('body');
                headers = parsedJSON.headers;
                body = parsedJSON.body;


            }

            headers.should.have.property('content-type', APPLICATION_CONTENT);
            headers.should.have.property(PERSONAL_HEADER_1_NAME, PERSONAL_HEADER_1_VALUE);
            headers.should.have.property(PERSONAL_HEADER_2_NAME, PERSONAL_HEADER_2_VALUE);
            body.should.be.equal(CONTENT);

            res.writeHead(200);
            res.end();
            callbackServer.close();

            done();
        });
    }).listen(config.callBackPort, launchServerAndPetition);    //Test cannot start until callback server is listening

    serversToShutDown.push(callbackServer);
}

describe('Retry', function () {

    afterEach(function() {
        for (var i = 0; i < serversToShutDown.length; i++) {
            try {
                serversToShutDown[i].close();
            } catch (e) {

            }
        }

        serversToShutDown = [];
    });

    it('The last retry will work', function (done) {

        var retryTimes = '1,25,100',
            petitionCorrect = retryTimes.split(',').length + 1,
            serverTimes = retryTimes.split(',').length + 1,
            petitionsReceived = 0;

        runTest(retryTimes, petitionCorrect, serverTimes, done);
    })

    it('The second retry will work', function (done) {

        var retryTimes = '1,25,100',
            petitionCorrect = retryTimes.split(',').length,
            serverTimes = retryTimes.split(',').length,
            petitionsReceived = 0;

        runTest(retryTimes, petitionCorrect, serverTimes, done);
    })

    it('None retry will work', function (done) {

        var retryTimes = '1,25,100',
            petitionCorrect = retryTimes.split(',').length + 2,
            serverTimes = retryTimes.split(',').length + 1,
            petitionsReceived = 0;

        runTest(retryTimes, petitionCorrect, serverTimes, done);
    })
});