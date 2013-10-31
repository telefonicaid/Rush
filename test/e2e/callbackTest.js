var http = require('http');
var should = require('should');
var config = require('./config.js');
var server = require('./simpleServer.js');
var utils = require('./utils.js');

var consumer = require('../../lib/consumer.js');
var listener = require('../../lib/listener.js');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

var applicationContent = 'application/json',
    personalHeader1name = 'personal-header-1',
    personalHeader1value = 'TEST1',
    personalHeader2name = 'personal-header-2',
    personalHeader2value = 'TEST2';

var options = {};
options.host = HOST;
options.port = PORT;
options.headers = {};
options.headers['content-type'] = applicationContent;
options.headers[personalHeader1name] = personalHeader1value;
options.headers[personalHeader2name] = personalHeader2value;

var serversToShutDown = [];

function prepareServerAndSendPetition(type, content, httpCallBack, callback) {
  'use strict';
  //Variables
  var RELAYER_HOST = config.simpleServerHostname + ':' + config.simpleServerPort, PATH = '/test1?a=b';

  //Start up the server
  var simpleServer = server.serverListener(

      function() {

        //Petition method
        options.method = type;
        options.path = PATH,
        options.headers['x-relayer-host'] = RELAYER_HOST;
        options.headers['x-relayer-httpcallback'] = httpCallBack;

        utils.makeRequest(options, content, function(err, data) {
        });

      },

      function(method, headers, url, contentReceived) {
        //Test method
        method.should.be.equal(type);
        url.should.be.equal(PATH);

        //Test headers
        headers.should.have.property('content-type', applicationContent);
        headers.should.have.property(personalHeader1name, personalHeader1value);
        headers.should.have.property(personalHeader2name, personalHeader2value);

        //Test content
        contentReceived.should.be.equal(content);

        if (callback) {
          callback();
        }
      }
  );

  serversToShutDown.push(simpleServer);

}

function makeRequest(type, content, done) {
  'use strict';
  //Variables
  var portCallBack = config.callBackPort, serverCallback;

  //Callback Server
  serverCallback = http.createServer(function(req, res) {

    var response = '';

    req.on('data',
        function(chunk) {
          response += chunk;
        });

    req.on('end',
        function() {
          var parsedJSON = JSON.parse(response);
          parsedJSON.should.have.property('body', content);
          parsedJSON.should.have.property('statusCode', 200);

          res.writeHead(200);
          res.end();
          serverCallback.close();

          done();
        });

  }).listen(portCallBack, prepareServerAndSendPetition.bind({},
      type, content, 'http://localhost:' + portCallBack));

  serversToShutDown.push(serverCallback);
}

describe('Single Feature: Callback #FCB', function() {
  'use strict';
  var content = 'HTTP_Callback Test';

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

  afterEach(function() {
    for (var i = 0; i < serversToShutDown.length; i++) {
      try {
        serversToShutDown[i].close();
      } catch (e) {

      }
    }

    serversToShutDown = [];
  });

  describe('Using method / POST', function() {

    it('Case 1 Should receive a callback on a correct ' +
        'POST petition #FCB', function(done) {
      makeRequest('POST', content, done);
    });
  });

  describe('Using method / PUT', function() {

    it('Case 1 Should receive a callback on a correct ' +
        'PUT petition #FCB', function(done) {
      makeRequest('PUT', content, done);
    });
  });

  describe('Using method / GET', function() {

    it('Case 1 Should receive a callback on a correct ' +
        'GET petition #FCB', function(done) {
      makeRequest('GET', '', done);
    });
  });

  describe('Using method / DELETE', function() {

    it('Case 1 Should receive a callback on a correct ' +
        'DELETE petition #FCB', function(done) {
      makeRequest('DELETE', '', done);
    });
  });

  describe('Second petition should be completed even if ' +
      'the first callback is incorrect', function() {

    it('Case 1 Consumer should not die even if the ' +
        'callback is not responding #FCB', function(done) {
      prepareServerAndSendPetition('POST',
          content, 'http://localhost:8888', done);
    });

    it('Case 2 Should receive a callback even if the ' +
        'callback of the last petition was incorrect #FCB', function(done) {
      makeRequest('POST', content, done);
    });
  });

  describe('Callback has to be called even ' +
      'if the Host is incorrect', function() {
    it('Case 1 Should receive a callback with an error #FCB', function(done) {

      var portCallBack = config.callBackPort,
          serverCallback,
          relayerHost = 'noexiste:1234',
          httpCallBack = 'http://localhost:' + portCallBack;

      //Callback Server
      serverCallback = http.createServer(function(req, res) {

        var response = '';

        req.on('data',
            function(chunk) {
              response += chunk;
            });

        req.on('end',
            function() {

              var parsedJSON = JSON.parse(response);
              should.not.exist(parsedJSON.result);

              parsedJSON['exception'].should.have.property('exceptionId', 'SVC Relayed Host Error');
              parsedJSON['exception'].should.have.property('exceptionText');
              parsedJSON['exception']['exceptionText'].should.match(/(ENOTFOUND|EADDRINFO)/);

              res.writeHead(200);
              res.end();
              serverCallback.close();
              done();
            });

      }).listen(portCallBack,
          function() {
            options.method = 'POST';
            options.headers['X-Relayer-Host'] = relayerHost;
            options.headers['x-relayer-httpcallback'] = httpCallBack;

            utils.makeRequest(options, content, function(err, data) {
            });
          }
      );

      serversToShutDown.push(serverCallback);
    });
  });
});
