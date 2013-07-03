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
  var headers = {
    'X-Relayer-Host': 'http://127.0.0.1:8014/test?parameters=sent&tab=01/test2?newparam=test&pAsSindng=Session',
    'testheader': HEADER_TEST_VALUE
  };
  var options = {
    host: HOST,
    port: PORT,
    method: method,
    path: '/relay',
    headers: headers,
    //  key: fs.readFileSync('../../utils/server.key'),
    //   cert: fs.readFileSync('../../utils/server.crt'),
    agent: false,
    rejectUnauthorized: false
  };


  var simpleServer = server.serverListener(
      function () {
        utils.makeRequestHttps(options, content, function () {
        });
      },
      function (method, headers, body) {
        method.should.be.equal(method);
        headers.should.have.property('testheader', HEADER_TEST_VALUE);
        headers.should.have.property('x-forwarded-for');
        headers.should.have.property('host', config.simpleServerHostname + ":" + config.simpleServerPort);
        if (content) {
          body.should.be.equal(content);
        }
        done();
      }
  );
  serversToShutDown.push(simpleServer);
}

describe('Feature: ONEWAY with HTTPS', function () {

  before(function (done) {
    listener.start(function() {
      consumer.start(done);
    });
  });

  after(function (done) {
    listener.stop(function() {
      consumer.stop(done);
    });
  });

  afterEach(function () {
    for (var i = 0; i < serversToShutDown.length; i++) {
      try {
        serversToShutDown[i].close();
      } catch (e) {

      }
    }

    serversToShutDown = [];
  });

  it('Should return the same headers and the same method / GET', function (done) {
    executeTest('GET', undefined, done);
  });

  it('Should return the same headers, method and body / POST', function (done) {
    var content = 'Hello World';
    executeTest('POST', content, done);
  });

  it('Should return the same headers, method and body / PUT', function (done) {
    var content = 'Hello World';
    executeTest('PUT', content, done);
  });

  it('Should return the same headers and the same method / DELETE', function (done) {
    executeTest('GET', undefined, done);
  });
});

describe('Feature ONEWAY with HTTPS Limits', function () {

  before(function (done) {
    listener.start(function() {
      consumer.start(done);
    });
  });

  after(function (done) {
    listener.stop(function() {
      consumer.stop(done);
    });
  });

  afterEach(function () {
    for (var i = 0; i < serversToShutDown.length; i++) {
      try {
        serversToShutDown[i].close();
      } catch (e) {

      }
    }

    serversToShutDown = [];
  });

  var contentLarge = '1234567890__________________________¿?=)(/&%$·"!!"·$%&/()=?Hello World¿?=)(/&%$·"!!"·$%&/()=?¿)20%/\n=)(/&%$·qwertyuiopz>></HTML><br>\n\n\b\n<111111111111111111111111111111111111111111111111111111111111111111111111111111111222222222222222222222222222222222222222222222222222222222222333333333333333333333333333333333333333333444444444444444444444444444444444444444444444444444444444444445555555555555555555555555555555555555555555666666666666666666666666666666666666666666666666666666777777777777777777777777777777777777777777777777777777777777777788888888888888888888888888888888888888888888888888889999999999999999999999999999999999999000000000000000000000000000000000000000000111111111111111111111111111111111111122222222222222222222222222222222222222222222222222222222222222333333333333333333333333333333333333333333333333333333333333334444444444444444444444444444444444444444444444444444555555555555555555555555555555566666666666666666666666666666666666667777777777777777777777777888888888888888888888888888888888999999999999999999999999999999999999999900000000000000000000000000';

  it('Should return the same data / POST ', function (done) {
    executeTest('POST', contentLarge, done);
  });

  it('Should return the same data / PUT ', function (done) {
    executeTest('PUT', contentLarge, done);
  });

  it('Should return the same data / HEAD ', function (done) {
    executeTest('HEAD', undefined, done);
  });

  it('Should return the same data / TRACE ', function (done) {
    executeTest('TRACE', undefined, done);
  });

  it('Should return the same data / GET ', function (done) {
    executeTest('GET', undefined, done);
  });

  it('Should return the same data / DELETE ', function (done) {
    executeTest('TRACE', undefined, done);
  });

});
