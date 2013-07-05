var async = require('async');
var should = require('should');
var config = require('./config.js')
var server = require('./simpleServer.js');
var utils = require('./utils.js');

var serversToShutDown = [];

var consumer = require('../../lib/consumer.js');
var listener = require('../../lib/listener.js');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

function executeTest(method, content, persistence, done) {
  'use strict';

  var id, options = {};
  var HEADER_NAME = 'test-header', HEADER_VALUE = 'test header 1', PATH = '/testa/testb/testc?a=b&c=d';

  options.host = HOST;
  options.port = PORT;
  options.path = PATH;
  options.headers = {};
  options.method = method;
  options.headers['content-type'] = 'application/json';
  options.headers['X-Relayer-Host'] =  config.simpleServerHostname + ':' + config.simpleServerPort;
  options.headers['X-relayer-persistence'] = persistence;
  options.headers[HEADER_NAME] = HEADER_VALUE;

  var simpleServer = server.serverListener(

      function() {
        utils.makeRequest(options, content, function(err, res) {
          should.not.exist(err);
          id = JSON.parse(res).id;
        });
      },

      function(methodUsed, headersReceived, urlUsed, bodyReceived) {

        methodUsed.should.be.equal(method);
        headersReceived.should.have.property(HEADER_NAME, HEADER_VALUE);
        urlUsed.should.be.equal(PATH);

        var checked = false;
        var interval = setInterval(function() {

          var options = { port: PORT, host: HOST,
            path: '/response/' + id, method: 'GET'};

          function checkResponse(err, data, res) {

            if (!checked && res.statusCode !== 404) {

              clearInterval(interval);

              var JSONres = JSON.parse(data);

              if (persistence === 'BODY') {

                JSONres.should.have.property('body');
                JSONres.body.should.be.equal(content);
                JSONres.headers.should.have.property(HEADER_NAME, HEADER_VALUE);
                JSONres.should.have.property('statusCode', '200');

              } else if (persistence === 'HEADER') {


                JSONres.should.not.have.property('body');
                JSONres.should.have.property('headers');
                JSONres.headers.should.have.property(HEADER_NAME, HEADER_VALUE);
                JSONres.should.have.property('statusCode', '200');

              } else if (persistence === 'STATUS') {

                JSONres.should.not.have.property('body');
                JSONres.should.not.have.property('headers');
                JSONres.should.have.property('statusCode', '200');

              }

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

describe('Feature: Persistence', function() {

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


  it('should return 404 if the persistence doesn\'t exist', function(done){
    var id = 'not_an_id';
    utils.makeRequest({host:HOST, port:PORT, path : '/response/' + id}, '', function(err, data, res) {
      should.not.exist(err);
      res.should.have.property('statusCode', 404);
      var JSONres = JSON.parse(data);
      JSONres.should.have.property('exceptionId','SVC1006');
      JSONres.should.have.property('exceptionText', 'Resource not_an_id does not exist');
      done();
    });
  });

  it('should return empty body and test-header', function(done) {
    executeTest('GET', '', 'BODY', done);
  });

  it('should return the same body', function(done) {
    executeTest('POST', 'Body Example', 'BODY', done);
  });

  it ('should return status and header. should not return body', function(done) {
    executeTest('POST', 'Body Example', 'HEADER', done);
  });

  it ('should not return body neither heraders', function(done) {
    executeTest('POST', 'Body Example', 'STATUS', done);
  });

  it('should return error headers (ENOTFOUND)', function(done) {
    var id, options = {};
    options.host = HOST;
    options.port = PORT;
    options.headers = {};
    options.method = 'POST';
    options.headers['X-Relayer-Host'] = 'notAServer:8014';
    options.headers['X-relayer-persistence'] = 'BODY';
    options.headers['test-header'] = 'test header';

    async.series([
      function(callback) {
        utils.makeRequest(options, 'body request', function(err, res) {
          id = JSON.parse(res).id;

          if (!err) {
            callback(null, res);
          } else {
            callback(err, null);
          }

        });
      },

      function(callback) {

        var checked = false;
        var interval = setInterval(function() {

          var options = { port: PORT, host: HOST,
            path: '/response/' + id, method: 'GET'};

          function checkResponse(err, data, res) {

            if (!checked && res.statusCode !== 404) {

              clearInterval(interval);

              if (!err) {
                callback(null, JSON.parse(data));
              } else {
                callback(err, null);
              }

              checked = true;
            }
          }

          utils.makeRequest(options, '', checkResponse);

        }, 10);
      }
    ], function(err, res) {
      var resGet = res[1];

      resGet.should.have.property('exception');
      resGet['exception'].should.have.property('exceptionId', 'SVC Relayed Host Error');
      resGet['exception'].should.have.property('exceptionText', 'getaddrinfo ENOTFOUND');

      done();
    });
  });
});
