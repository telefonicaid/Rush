var config = require('./config.js');
var https = require('https');
var http = require('http');
var should = require('should');
var server = require('./simpleServer.js');
var utils = require('./utils.js');
var fs = require('fs');

var consumer = require('../../lib/consumer.js');
var listener = require('../../lib/listener.js');

var HOST = config.rushServerHttps.hostname;
var PORT = config.rushServerHttps.port;

var HEADER_TEST_VALUE = 'valueTest';
var serversToShutDown = [];

function executeTest(method, content, done) {
  'use strict';

  var PATH = '/test?parameters=sent&tab=01/test2?newparam=test&pAsSindng=Session';

  var headers = {
    'X-Relayer-Host': config.simpleServerHostname + ':' + config.simpleServerPort,
    'X-Relayer-Protocol': 'http',
    'testheader': HEADER_TEST_VALUE
  };
  var options = {
    host: HOST,
    port: PORT,
    path: PATH,
    method: method,
    headers: headers,
    //  key: fs.readFileSync('../../utils/server.key'),
    //   cert: fs.readFileSync('../../utils/server.crt'),
    agent: false,
    rejectUnauthorized: false
  };

  var simpleServer = server.serverListener(
      function() {
        utils.makeRequestHttps(options, content, function() {
        });
      },
      function(methodUsed, headers, url, body) {
        methodUsed.should.be.equal(method);
        url.should.be.equal(PATH);

        headers.should.have.property('testheader', HEADER_TEST_VALUE);
        headers.should.have.property('x-forwarded-for');
        headers.should.have.property('host', config.simpleServerHostname + ':' + config.simpleServerPort);

        if (content) {
          body.should.be.equal(content);
        }
        done();
      }
  );
  serversToShutDown.push(simpleServer);
}

describe('Multiple Feature: ONEWAY with HTTPS #FOW', function() {
  'use strict';

  before(function(done) {
    listener.start(function() {
      consumer.start(done);
    });
  });

  after(function(done) {
    listener.stop(function() {
      consumer.stop(done);
    });
  });

  afterEach(function() {
    for (var i = 0; i < serversToShutDown.length; i++) {
      try {
        serversToShutDown[i].close();
      } catch (e) {

      }
    }

    serversToShutDown = [];
  });

  it('Case 1 Should return the same headers and the same method / GET #FOW', function(done) {
    executeTest('GET', undefined, done);
  });

  it('Case 2 Should return the same headers, method and body / POST #FOW', function(done) {
    var content = 'Hello World';
    executeTest('POST', content, done);
  });

  it('Case 3 Should return the same headers, method and body / PUT #FOW', function(done) {
    var content = 'Hello World';
    executeTest('PUT', content, done);
  });

  it('Case 4 Should return the same headers and the same method / DELETE #FOW', function(done) {
    executeTest('GET', undefined, done);
  });
});

describe('Multiple Feature: ONEWAY with HTTPS / Checking limits ', function() {
  'use strict';

  before(function(done) {
    listener.start(function() {
      consumer.start(done);
    });
  });

  after(function(done) {
    listener.stop(function() {
      consumer.stop(done);
    });
  });

  afterEach(function() {
    for (var i = 0; i < serversToShutDown.length; i++) {
      try {
        serversToShutDown[i].close();
      } catch (e) {

      }
    }

    serversToShutDown = [];
  });

  var contentLarge = '1234567890__________________________¿?=)(/&%$·"!!"·$%&/()=?Hello World¿?=)(/&%$·"!!"·$%&/()=' +
      '?¿)20%/\n=)(/&%$·qwertyuiopz>></HTML><br>\n\n\b\n<111111111111111111111111111111111111111111111111111111111' +
      '11111111111111111111111122222222222222222222222222222222222222222222222222222222222233333333333333333333333' +
      '33333333333333333334444444444444444444444444444444444444444444444444444444444444455555555555555555555555555' +
      '55555555555555555666666666666666666666666666666666666666666666666666666777777777777777777777777777777777777' +
      '77777777777777777777777777778888888888888888888888888888888888888888888888888888999999999999999999999999999' +
      '99999999990000000000000000000000000000000000000000001111111111111111111111111111111111111222222222222222222' +
      '22222222222222222222222222222222222222222222333333333333333333333333333333333333333333333333333333333333334' +
      '44444444444444444444444444444444444444444444444444455555555555555555555555555555556666666666666666666666666' +
      '66666666666677777777777777777777777778888888888888888888888888888888889999999999999999999999999999999999999' +
      '99900000000000000000000000000';

  it('Case 1 Should return the response / POST #FOW', function(done) {
    executeTest('POST', contentLarge, done);
  });

  it('Case 2 Should return the response / PUT #FOW', function(done) {
    executeTest('PUT', contentLarge, done);
  });

  it('Case 3 Should return the response / HEAD #FOW', function(done) {
    executeTest('HEAD', undefined, done);
  });

  it('Case 4 Should return the response / TRACE #FOW', function(done) {
    executeTest('TRACE', undefined, done);
  });

  it('Case 5 Should return the response / GET #FOW', function(done) {
    executeTest('GET', undefined, done);
  });

  it('Case 6 Should return the response / DELETE #FOW', function(done) {
    executeTest('TRACE', undefined, done);
  });

});
