var async = require('async');
var should = require('should');
var config = require('./config.js');
var server = require('./simpleServer.js');
var utils = require('./utils.js');

var consumer = require('../../lib/consumer.js');
var listener = require('../../lib/listener.js');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

function executeTest(method, body, done) {
  var id, options = {};
  var PATH = '/testPath/test1/test2/?var=a&var2=b',
      TEST_HEADER_NAME = 'test-header', TEST_HEADER_VALUE = 'test header value',
      traceID = 'a8450a60-ea01-11e2-bd82-3baee03998f0';

  options.host = HOST;
  options.port = PORT;
  options.method = method;
  options.path = PATH;
  options.headers = {};
  options.headers['content-type'] = 'application/json';
  options.headers['X-Relayer-Host'] =  config.simpleServerHostname + ':' + config.simpleServerPort;
  options.headers['X-relayer-persistence'] = 'BODY';
  options.headers[TEST_HEADER_NAME] = TEST_HEADER_VALUE;
  options.headers['X-Relayer-traceid'] = traceID;

  var simpleServer = server.serverListener(

      function() {
        utils.makeRequest(options, body, function(err, res) {
          id = JSON.parse(res).id;
          //console.log(id);
        });
      },

      function(methodReceived, headersReceived, url, bodyReceived) {

        methodReceived.should.be.equal(method);
        url.should.be.equal(PATH);
        headersReceived.should.have.property(TEST_HEADER_NAME, TEST_HEADER_VALUE);

        var checked = false;
        var interval = setInterval(function() {
          var options = { port: PORT, host: HOST,
            path: '/response/' + id, method: 'GET'};
          options.headers = { 'X-Relayer-Traceid' : traceID };

          function checkResponse(err, data, res) {

            if (!checked && res.statusCode !== 404) {

              clearInterval(interval);

              var JSONres = JSON.parse(data);
              JSONres.body.should.be.equal(body);
              JSONres.headers.should.have.property(TEST_HEADER_NAME, TEST_HEADER_VALUE);
              JSONres.should.have.property('traceID', traceID);

              checked = true;
              done();
            }
          }
          utils.makeRequest(options, '', checkResponse);
        }, 10);
      }
  );
  serversToShutDown.push(simpleServer);
}

var serversToShutDown = [];


describe('Feature: Topic', function() {

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


  it('Should return  the correct topic id / GET', function(done) {
    executeTest('GET', '', done);
  });


  it('Should return  the correct topic id / POST', function(done) {
    executeTest('POST', 'TEST BODY 1', done);

  });

  it('Should return  the correct topic id / PUT', function(done) {
    executeTest('PUT', 'TEST BODY 2', done);
  });
});
