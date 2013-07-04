var http = require('http');
var should = require('should');
var config = require('./config.js');
var server = require('./simpleServer.js');
var utils = require('./utils.js');

var consumer = require('../../lib/consumer.js');
var listener = require('../../lib/listener.js');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

var HEADER_TEST_VALUE = 'valueTest';

var serversToShutDown = [];

function executeTest(method, content, done) {
  var headers = {
    'X-Relayer-Host': 'localhost:8014',
    'testheader': HEADER_TEST_VALUE
  };

  var options = {
    host: HOST,
    port: PORT,
    method: method,
    headers: headers
  };

  var simpleServer = server.serverListener(
      function() {
        utils.makeRequest(options, content, function() {
        });
      },
      function(method, headers, url, body) {
        method.should.equal(method);

        headers.should.have.property('testheader',
            HEADER_TEST_VALUE);

        if (content) {

          body.should.be.equal(content);
        }

        done();
      }
  );

  serversToShutDown.push(simpleServer);
}

describe('Feature: ONEWAY with HTTP', function() {

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

  afterEach(function() {
    for (var i = 0; i < serversToShutDown.length; i++) {
      try {
        serversToShutDown[i].close();
      } catch (e) {

      }
    }

    serversToShutDown = [];
  });

  it('Should return the same headers and the same method / GET', function(done) {
    executeTest('GET', undefined, done);
  });

  it('Should return the same headers, method and body / POST', function(done) {
    var content = 'Hello World'
    executeTest('POST', content, done);
  });

  it('Should return the same headers, method and body / PUT ', function(done) {
    var content = 'Hello World'
    executeTest('PUT', content, done);
  });

  it('Should return the same headers and the same method / DELETE', function(done) {
    executeTest('GET', undefined, done);
  });
});
