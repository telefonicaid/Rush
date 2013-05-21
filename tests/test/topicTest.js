var should = require('should');
var server = require('./simpleServer.js');
var utils = require('./utils.js');
var async = require('async');

function executeTest(method, done) {
  var id, options = {};

  options.method = method;
  options.host = 'localhost';
  options.port = 5001;
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

          var options = { port: 5001, host: 'localhost',
            path: '/response/' + id, method: 'GET'};

          function checkResponse(err, data) {

            if (data !== '{}' && ! checked) {

              clearInterval(interval);

              var JSONres = JSON.parse(data);
              JSONres.body.should.be.equal('');
              JSONres.headers.should.have.property('test-header',
                  'test header');
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


describe('Topic Test', function() {

  afterEach(function() {
    for (var i = 0; i < serversToShutDown.length; i++) {
      try {
        serversToShutDown[i].close();
      } catch (e) {

      }
    }
    serversToShutDown = [];
  });


  it('Should return  the correct topic id (GET)', function(done) {
    executeTest('GET', done);
  });


  it('Should return  the correct topic id (POST)', function(done) {
    executeTest('POST', done);

  });

  it('Should return  the correct topic id (PUT)', function(done) {
    executeTest('PUT', done);
  });
});
