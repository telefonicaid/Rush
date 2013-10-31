var http = require('http');
var should = require('should');
var config = require('./config.js');
var simpleServer = require('./simpleServer.js');
var utils = require('./utils.js');

var consumer = require('../../lib/consumer.js');
var listener = require('../../lib/listener.js');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

describe('Single Feature: Proxy Server #FPX', function() {
  'use strict';

  var proxyServer;
  var headers = {
    testHeader: 'a',
    headerTest: 'b',
    myOwnHeader: 'c'
  };

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

  afterEach(function(done) {
    try {
      proxyServer.close();
    } catch (e) { }

    done();
  });

  function makeTest(relayerHost, method, headers, content, done) {

    var id;
    var PATH = '/test1/test2/test3?aaa=bbb&ccc=ddd';

    var makeRequest = function() {

      var options = {};
      options.host = HOST;
      options.port = PORT;
      options.path = PATH;
      options.headers = {};
      options.method = method;
      options.headers['x-relayer-persistence'] = 'BODY';
      options.headers['x-relayer-proxy'] = config.simpleServerHostname + ':' + config.simpleServerPort;
      options.headers['x-relayer-host'] = relayerHost;

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
    };

    proxyServer = simpleServer.serverListener(makeRequest, function(usedMethod, receivedHeaders,
        usedURL, receivedContent) {

      usedMethod.should.be.equal(method);
      usedURL.should.be.equal('http://' + relayerHost + PATH);


      receivedHeaders.should.have.property('host', relayerHost);  //target host
      receivedHeaders.should.have.property('x-forwarded-for', '127.0.0.1');

      //Check our headers
      for (var headerID in headers) {
        receivedHeaders.should.have.property(headerID.toLowerCase(), headers[headerID]);
      }

      receivedContent.should.be.equal(content);

      //Persistence is requested, so status, headers and body should be able to be retrieved.
      //We should check that these fields are consistent with the information provided by the server
      var checked = false;
      var interval = setInterval(function() {

        var options = { port: PORT, host: HOST,
          path: '/response/' + id, method: 'GET'};

        function checkResponse(err, data, res) {

          var parsedData = JSON.parse(data);

          if (!checked && res.statusCode !== 404 && parsedData.state === 'completed') {

            clearInterval(interval);
            should.not.exist(err);


            parsedData.should.have.property('headers');
            var parsedHeaders = parsedData.headers;
            for (var headerID in headers) {
              parsedHeaders.should.have.property(headerID.toLowerCase(), headers[headerID]);
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

  it('Case 1 Using method / GET #FPX', function(done) {
    makeTest('locahost:56841', 'GET', headers, '', done);
  });

  it('Case 2 Using method / POST #FPX', function(done) {
    makeTest('locahost:56841', 'POST', headers, 'this is a test', done);
  });

  it('Case 3 Using method / PUT #FPX', function(done) {
    makeTest('locahost:56841', 'PUT', headers, 'this is a test', done);
  });

  it('Case 4 Using method / DELETE #FPX', function(done) {
    makeTest('locahost:56841', 'DELETE', headers, '', done);
  });
});
