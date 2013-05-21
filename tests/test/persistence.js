var should = require('should');
var server = require('./simpleServer.js');
var utils = require('./utils.js');
var async = require('async');

var serversToShutDown = [];

function executeTest(method, content, persistence, done) {
  'use strict';

  var id, options = {};
  options.host = 'localhost';
  options.port = 5001;
  options.headers = {};
  options.method = method;
  options.headers['content-type'] = 'application/json';
  options.headers['X-Relayer-Host'] = 'http://localhost:8014';
  options.headers['X-relayer-persistence'] = persistence;
  options.headers['test-header'] = 'test header';


  var simpleServer = server.serverListener(

      function() {
        utils.makeRequest(options, content, function(err, res) {
          id = JSON.parse(res).id;
        });
      },

      function(method, headers, body) {

        var checked = false;
        var interval = setInterval(function() {

          var options = { port: 5001, host: 'localhost',
            path: '/response/' + id, method: 'GET'};

          function checkResponse(err, data) {

            if (data !== '{}' && ! checked) {

              clearInterval(interval);

              var JSONres = JSON.parse(data);

              if (persistence === 'BODY') {

                JSONres.should.have.property('body');
                JSONres.body.should.be.equal(content);
                JSONres.headers.should.have.property('test-header',
                    'test header');
                JSONres.should.have.property('statusCode', '200');

              } else if (persistence === 'HEADER') {


                JSONres.should.not.have.property('body');
                JSONres.should.have.property('headers');
                JSONres.headers.should.have.property('test-header',
                    'test header');
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

describe('Persistence', function() {

  afterEach(function() {
    for (var i = 0; i < serversToShutDown.length; i++) {
      try {
        serversToShutDown[i].close();
      } catch (e) {

      }
    }

    serversToShutDown = [];
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
    options.host = 'localhost';
    options.port = 5001;
    options.headers = {};
    options.method = 'POST';
    options.headers['X-Relayer-Host'] = 'http://notAServer:8014';
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

          var options = { port: 5001, host: 'localhost',
            path: '/response/' + id, method: 'GET'};

          function checkResponse(err, data) {

            if (data !== '{}' && ! checked) {

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
      resGet.should.have.property('error', 'ENOTFOUND(getaddrinfo)');
      done();
    });
  });
});
