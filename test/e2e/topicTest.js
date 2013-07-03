var async = require('async');
var should = require('should');
var config = require('./config.js');
var server = require('./simpleServer.js');
var utils = require('./utils.js');

var consumer = require('../../lib/consumer.js');
var listener = require('../../lib/listener.js');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

function executeTest(method, done) {
  var id, options = {};

  options.method = method;
  options.host = HOST;
  options.port = PORT;
  options.path = '/relay';
  options.headers = {};
  options.headers['content-type'] = 'application/json';
  options.headers['X-Relayer-Host'] = 'http://localhost:8014';
  options.headers['X-relayer-persistence'] = 'BODY';
  options.headers['test-header'] = 'test header';
  options.headers['X-Relayer-topic'] = 'Topic test';

  var simpleServer = server.serverListener(

      function() {
        utils.makeRequest(options, '', function(err, res) {
          id = JSON.parse(res).id;
          //console.log(id);
        });
      },

      function(method, headers, body) {
        var checked = false;
        var interval = setInterval(function() {
          var options = { port: PORT, host: HOST,
            path: '/response/' + id, method: 'GET'};
          function checkResponse(err, data) {
            if (data !== '{}' && ! checked) {
              clearInterval(interval);
              var JSONres = JSON.parse(data);
              JSONres.body.should.be.equal('');
              JSONres.headers.should.have.property('test-header','test header');
              JSONres.should.have.property('topic', 'Topic test');
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
    executeTest('GET', done);
  });


  it('Should return  the correct topic id / POST', function(done) {
    executeTest('POST', done);

  });

  it('Should return  the correct topic id / PUT', function(done) {
    executeTest('PUT', done);
  });
});
