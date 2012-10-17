var should = require('should');
var utils = require('./utils.js');
var http = require('http');

describe('Retry', function () {

    it('Should', function (done) {

        var nPetitions = 0,
            content = 'Retry Test',
            applicationContent = 'application/json',
            relayerHost = 'http://localhost:8014',
            retryTimes = '1,25,100',
            personalHeader1name = 'personal-header-1',
            personalHeader1value = 'TEST1',
            personalHeader2name = 'personal-header-2',
            personalHeader2value = 'TEST2',
            serverTimes = retryTimes.split(',').length + 1;

        function executeTest() {

            //Petition method
            var options = {};
            options.host = 'localhost';
            options.port = '8030';
            options.method = 'POST';
            options.headers = {};
            options.headers['content-type'] = applicationContent;
            options.headers['X-Relayer-Host'] = relayerHost;
            options.headers['X-relayer-retry'] = retryTimes;
            options.headers[personalHeader1name] = personalHeader1value;
            options.headers[personalHeader2name] = personalHeader2value;

            utils.makeRequest(options, content, function (e, data) {
                //console.log(e);
                //console.log(data);
            });
        }

        var srv = http.createServer(function (req, res) {
            var headers = req.headers,
                method = req.method,
                contentReceived = '';

            req.on('data', function (chunk) {
                contentReceived += chunk;
            });

            req.on('end', function () {

                nPetitions += 1;

                if (nPetitions === serverTimes) {
                    res.writeHead(200, headers);
                } else {
                    res.writeHead(500, headers);
                }

                res.end(contentReceived);
                req.destroy();

                //Test petition
                method.should.be.equal('POST');
                headers['content-type'].should.be.equal(applicationContent);
                headers['x-relayer-host'].should.be.equal(relayerHost);
                contentReceived.should.be.equal(content);

                if (nPetitions === serverTimes) {
                    srv.close();
                    done();
                }
            });
        }).listen(8014, executeTest);

    })

});