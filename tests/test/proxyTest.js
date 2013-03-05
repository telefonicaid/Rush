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

    var id;

    var makeRequest = function () {

      var options = {};
      options.host = config.rushServer.hostname;
      options.port = config.rushServer.port;
      options.headers = {};
      options.method = method;
      options.headers['x-relayer-persistence'] = 'BODY';
      options.headers['x-relayer-proxy'] = 'localhost:8014';
      options.headers['x-relayer-host'] = 'http://' + relayerHost;

      //Insert our headers
      for (var header in headers) {
        options.headers[header] = headers[header];
      }

      utils.makeRequest(options, content, function(err, data) {
        should.not.exist(err);

        var parsedData = JSON.parse(data);
        parsedData.should.have.property('id');
        id = parsedData.id;
      });
    }

    proxyServer = simpleServer.serverListener(makeRequest, function (methodReceived, headersReceived, contentReceived) {
      methodReceived.should.be.equal(method);

      headersReceived.should.have.property('host', relayerHost);  //target host
      headersReceived.should.have.property('x-forwarded-for', '127.0.0.1');

      //Check our headers
      for (var header in headers) {
        headersReceived.should.have.property(header.toLowerCase(), headers[header]);
      }

      contentReceived.should.be.equal(content);

      //Persistence is requested, so status, headers and body should be able to be retrieved.
      //We should check that these fields are consistent with the information provided by the server
      var checked = false;
      var interval = setInterval(function() {

        var options = { port: config.rushServer.port, host: config.rushServer.hostname,
          path: '/response/' + id, method: 'GET'};

        function checkResponse(err, data) {

          if (data !== '{}' && ! checked) {

            clearInterval(interval);
            should.not.exist(err);

            var parsedData = JSON.parse(data);

            parsedData.should.have.property('headers');
            var headersParsed = parsedData.headers;
            for (var header in headers) {
              headersParsed.should.have.property(header.toLowerCase(), headers[header]);
            }

            parsedData.should.have.property('body', content);
            parsedData.should.have.property('statusCode', '200');

            checked = true;

            done();

          }
        }

        utils.makeRequest(options, '', checkResponse);

      }, 10);
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