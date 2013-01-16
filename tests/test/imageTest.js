var should = require('should');
var utils = require('./utils.js');
var http = require('http');
var fs = require('fs');
var config = require('./config');
var path = require('path');

var DIR_MODULE = path.dirname(module.filename);

describe('Image Test', function() {

  var server, petitionID;
  var contentBinary = fs.readFileSync(DIR_MODULE + '/robot.png');

  afterEach(function(done) {
    if (server) {
      server.close();
    }

    done();
  });

  it('should return the image coded in base 64', function(done) {

    function makeRequest() {
      var options = {};

      options.host = 'localhost';
      options.port = 3001;
      options.headers = {};
      options.method = 'GET';
      options.headers['content-type'] = 'application/json';
      options.headers['X-Relayer-Host'] = 'http://localhost:8014';
      options.headers['X-relayer-persistence'] = 'BODY';
      options.headers['X-relayer-encoding'] = 'base64';

      utils.makeRequest(options, '', function(err, res) {
        petitionID = JSON.parse(res).id;
      });
    }

    //Launch Server
    server = http.createServer(function(req, res) {

      req.on('end', function() {
        res.writeHead(200);
        res.end(contentBinary);
        req.destroy();

        //Once the image has been written, polling is done until the image has been saved in redis or timeout.
        var checked = false;
        var interval = setInterval(function() {
          var options = {};

          options.host = 'localhost';
          options.port = 3001;
          options.path = '/response/' + petitionID;

          function checkResponse(err, res) {
            if (res !== '{}' && ! checked) {
              clearInterval(interval);

              should.not.exist(err);

              var parsedJSON = JSON.parse(res);
              parsedJSON.should.have.property('body');
              parsedJSON.should.have.property('encoding', 'base64');

              var body = parsedJSON.body;
              var buf = new Buffer(contentBinary);
              var base64 = buf.toString('base64');
              body.should.be.equal(base64);

              done();
              checked = true;
            }
          }

          utils.makeRequest(options, '', checkResponse);
        }, 1);
      });

    }).listen(config.simpleServerPort, makeRequest);    //The request is made when the server is running
  });
});
