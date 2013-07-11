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
    relayerHost =  config.simpleServerHostname + ':' + config.simpleServerPort,
    personalHeader1name = 'personal-header-1',
    personalHeader1value = 'TEST1',
    personalHeader2name = 'personal-header-2',
    personalHeader2value = 'TEST2';

var options = {};
options.host = HOST;
options.port = PORT;

var serversToShutDown = [];

function testHeraders(headers) {
  headers.should.have.property('content-type', applicationContent);
  headers.should.have.property(personalHeader1name, personalHeader1value);
  headers.should.have.property(personalHeader2name, personalHeader2value);
}


function makeRequest(type, persistence, content, done) {
  'use strict';

  //Variables
  var httpcallback = 'http://localhost:' + config.callBackPort,
      callbackServer, id;

  //Callback Server
  callbackServer = http.createServer(function(req, res) {

    var response = '';

    req.on('data',
        function(chunk) {
          response += chunk;
        });

    req.on('end', function() {
      res.writeHead(200);
      res.end();
      callbackServer.close();

      //Check content and headers
      var JSONRes = JSON.parse(response);
      JSONRes.should.have.property('body');
      JSONRes.body.should.be.equal(content);

      JSONRes.should.have.property('headers');
      testHeraders(JSONRes.headers);

      //Once the answer has been written, polling is done until the answer has been saved on redis or timeout.
      var checked = false;
      var interval = setInterval(function() {

        var options = { port: PORT, host: HOST,
          path: '/response/' + id, method: 'GET'};

        function checkResponse(err, data, res) {

          if (!checked && res.statusCode !== 404) {

            clearInterval(interval);

            should.not.exist(err);
            should.exist(data);
            var JSONRes = JSON.parse(data);

            if (persistence === 'BODY') {

              JSONRes.should.have.property('body');
              JSONRes.body.should.be.equal(content);
              testHeraders(JSONRes.headers);
              JSONRes.should.have.property('statusCode', '200');

            } else if (persistence === 'HEADER') {


              JSONRes.should.not.have.property('body');
              JSONRes.should.have.property('headers');
              testHeraders(JSONRes.headers);
              JSONRes.should.have.property('statusCode', '200');

            } else if (persistence === 'STATUS') {

              JSONRes.should.not.have.property('body');
              JSONRes.should.not.have.property('headers');
              JSONRes.should.have.property('statusCode', '200');

            }

            checked = true;
            done();
          }
        }

        utils.makeRequest(options, '', checkResponse);

      }, 10);
    });
  }).listen(config.callBackPort,

      //The petition will executed once the callback server and the target server are up
      function() {

        var PATH = '/test1/test2?a=b&b=c';

        //Start up the server
        var simpleServer = server.serverListener(

            function() {

              //Make request
              options.method = type;
              options.path = PATH;
              options.headers['x-relayer-persistence'] = persistence;
              options.headers['x-relayer-host'] = relayerHost;
              options.headers['x-relayer-httpcallback'] = httpcallback;

              utils.makeRequest(options, content, function(e, data) {
                id = JSON.parse(data).id;
              });
            },

            function(method, headers, url, contentReceived) {
              method.should.be.equal(type);
              url.should.be.equal(PATH);
              testHeraders(headers);
              contentReceived.should.be.equal(content);
            }
        );

        serversToShutDown.push(simpleServer);
      });

  serversToShutDown.push(callbackServer);
}

describe('Feature: Persistence HTTP_Callback', function() {
  'use strict';
  var content = 'Persistence&HTTPCallBack Test';

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

  beforeEach(function() {
    //Set initial headers
    options.headers = {};
    options.headers['content-type'] = applicationContent;
    options.headers[personalHeader1name] = personalHeader1value;
    options.headers[personalHeader2name] = personalHeader2value;
  })

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

    it('Persistence: BODY', function(done) {
      this.timeout(3000);
      makeRequest('POST', 'BODY', content, done);
    });

    it('Persistence: HEADER', function(done) {
      this.timeout(3000);
      makeRequest('POST', 'HEADER', content, done);
    });

    it('Persistence: STATUS', function(done) {
      this.timeout(3000);
      makeRequest('POST', 'STATUS', content, done);
    });
  });

  describe('Using method / PUT', function() {

    it('Persistence: BODY', function(done) {
      this.timeout(3000);
      makeRequest('PUT', 'BODY', content, done);
    });

    it('Persistence: HEADER', function(done) {
      this.timeout(3000);
      makeRequest('PUT', 'HEADER', content, done);
    });

    it('Persistence: STATUS', function(done) {
      this.timeout(3000);
      makeRequest('PUT', 'STATUS', content, done);
    });
  });

  describe('Using method / GET', function() {

    it('Persistence: BODY', function(done) {
      this.timeout(3000);
      makeRequest('GET', 'BODY', '', done);
    });

    it('Persistence: HEADER', function(done) {
      this.timeout(3000);
      makeRequest('GET', 'HEADER', '', done);
    });

    it('Persistence: STATUS', function(done) {
      this.timeout(3000);
      makeRequest('GET', 'STATUS', '', done);
    });
  });

  describe('Using method / DELETE', function() {

    it('Persistence: BODY', function(done) {
      this.timeout(3000);
      makeRequest('DELETE', 'BODY', '', done);
    });

    it('Persistence: HEADER', function(done) {
      this.timeout(3000);
      makeRequest('DELETE', 'HEADER', '', done);
    });

    it('Persistence: STATUS', function(done) {
      this.timeout(3000);
      makeRequest('DELETE', 'STATUS', '', done);
    });
  });

  describe('Second petition should be completed even if the' +
      ' first callback is incorrect', function() {

    it('CallBack Incorrect', function(done) {

      var id, type = 'POST', httpCallBack = 'http://noexiste:2222';

      var simpleServer = server.serverListener(

          function() {

            //Petition method
            options.method = type;
            options.headers['x-relayer-persistence'] = 'BODY';
            options.headers['x-relayer-host'] = relayerHost;
            options.headers['x-relayer-httpcallback'] = httpCallBack;

            utils.makeRequest(options, content, function(e, data) {
              id = JSON.parse(data).id;
            });
          },

          function(method, headers, url, contentReceived) {
            method.should.be.equal(type);
            testHeraders(headers);
            contentReceived.should.be.equal(content);

            var checked = false;
            var interval = setInterval(function() {

              var options = { port: PORT, host: HOST,
                path: '/response/' + id, method: 'GET'};

              function checkResponse(err, data, res) {

                if (!checked && res.statusCode !== 404 &&  data.indexOf('callback_err') !== -1) {

                  clearInterval(interval);

                  var JSONRes = JSON.parse(data);

                  JSONRes.body.should.be.equal(content);
                  testHeraders(JSONRes.headers);

                  JSONRes.should.have.property('statusCode', '200');
	                JSONRes['callback_err'].should.match(/(ENOTFOUND|EADDRINFO)/);

	                checked = true;
                  done();

                }
              }

              utils.makeRequest(options, '', checkResponse);

            }, 10);
          }
      );

      serversToShutDown.push(simpleServer);

    });


    it('CallBack Correct', function(done) {
      this.timeout(3000);
      makeRequest('POST', 'BODY', content, done);
    });
  });

  describe('Callback has to be called' +
      ' even if the Host is incorrect', function() {
    it('Should receive a callback with an error', function(done) {

      var portCallBack = config.callBackPort,
          callbackServer,
          relayerHost = 'noexiste:1234',
          httpCallBack = 'http://localhost:' + portCallBack, id;

      //Callback Server
      var callbackServer = http.createServer(function(req, res) {

        var response = '';

        req.on('data', function(chunk) {
          response += chunk;
        });

        req.on('end', function() {

          var parsedJSON = JSON.parse(response);
          should.not.exist(parsedJSON.result);

          //Test content
          parsedJSON['exception'].should.have.property('exceptionId', 'SVC Relayed Host Error');
          parsedJSON['exception'].should.have.property('exceptionText');
          parsedJSON['exception']['exceptionText'].should.match(/(ENOTFOUND|EADDRINFO)/);

	        res.writeHead(200);
          res.end();
          callbackServer.close();

          var options = { port: PORT, host: HOST,
            path: '/response/' + id, method: 'GET'};
          setTimeout(function() {
            utils.makeRequest(options, '', function(err, data) {
              var JSONparsed = JSON.parse(data);

              parsedJSON['exception'].should.have.property('exceptionId', 'SVC Relayed Host Error');
              parsedJSON['exception'].should.have.property('exceptionText');
              JSONparsed['exception']['exceptionText'].should.match(/(ENOTFOUND|EADDRINFO)/);
              JSONparsed.should.have.property('callback_status', '200');

              done();
            });
          }, 30 );

        });

      }).listen(portCallBack,  function() {
        //Petition method
        options.method = 'POST';
        options.headers['x-relayer-persistence'] = 'BODY';
        options.headers['X-Relayer-Host'] = relayerHost;
        options.headers['x-relayer-httpcallback'] = httpCallBack;

        utils.makeRequest(options, content,
            function(err, data) {
              id = JSON.parse(data).id;
            }
        );
      });

      serversToShutDown.push(callbackServer);
    });
  });
});
