var http = require('http');
var should = require('should');
var config = require('./config.js');
var simpleServer = require('./simpleServer.js');
var utils = require('./utils.js');

describe('Proxy Server', function() {
  'use strict';

  var proxyServer;

  afterEach(function(done) {
    try {
      proxyServer.close();
    } catch(e) {  }

    done();
  })

  function makeTest(relayerHost, method, headers, content, done) {
    var makeRequest = function () {

      var options = {};
      options.host = config.rushServer.hostname;
      options.port = config.rushServer.port;
      options.headers = {};
      options.method = method;
      options.headers['x-relayer-proxy'] = 'http://localhost:8014';
      options.headers['x-relayer-host'] = 'http://' + relayerHost;

      //Insert our headers
      for (var header in headers) {
        options.headers[header] = headers[header];
      }

      utils.makeRequest(options, content, function(err, data) { });
    }

    proxyServer = simpleServer.serverListener(makeRequest, function (methodReceived, headersReceived, contentReceived) {
      methodReceived.should.be.equal(method);
      headersReceived.should.have.property('host', relayerHost);
      headersReceived.should.have.property('x-forwarded-for', '127.0.0.1');

      //Check our headers
      for (var header in headers) {
        headersReceived.should.have.property(header.toLowerCase(), headers[header]);
      }

      contentReceived.should.be.equal(content);

      done();
    });
  }

  function createHeaders() {
    return {
      testHeader: 'a',
      headerTest: 'b',
      myOwnHeader: 'c'
    }
  }

  it('GET', function(done) {
    var headers = createHeaders();
    makeTest('locahost:5001', 'GET', headers, '', done);
  });

  it('POST', function(done) {
    var headers = createHeaders();
    makeTest('locahost:5001', 'POST', headers, 'this is a test', done);
  });

  it('PUT', function(done) {
    var headers = createHeaders();
    makeTest('locahost:5001', 'PUT', headers, 'this is a test', done);
  });

  it('DELETE', function(done) {
    var headers = createHeaders();
    makeTest('locahost:5001', 'DELETE', headers, '', done);
  });


});