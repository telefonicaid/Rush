/**
 * Created with JetBrains WebStorm.
 * User: david
 * Date: 11/10/12
 * Time: 10:35
 * To change this template use File | Settings | File Templates.
 */

var should = require('should');
var config = require('./config.js');
var http = require('http');
var server = require('./simpleServer.js');
var utils = require('./utils.js');

var host = config.rushServer.hostname;
var port = config.rushServer.port;

var serversToShutDown = [];

describe('Oneway', function() {

  afterEach(function() {
    for (var i = 0; i < serversToShutDown.length; i++) {
      try {
        serversToShutDown[i].close();
      } catch (e) {

      }
    }

    serversToShutDown = [];
  });

  describe('#GET', function() {
    it('Should return the same headers and the same method', function(done) {
      var headers = {
        'X-Relayer-Host': 'http://localhost:8014'
      };

      var options = {
        host: host,
        port: port,
        method: 'GET',
        headers: headers
      };

      var simpleServer = server.serverListener(function() {
        utils.makeRequest(options, undefined, function() {
        });
      }, function(method, headers, body) {
        method.should.equal('GET');
        done();
      });

      serversToShutDown.push(simpleServer);
    });
  });

  describe('#POST', function() {
    it('Should return the same headers, method and body', function(done) {
      var content = {
        content: 'Hello World'
      };

      var headers = {
        'content-type': 'application/json',
        'X-Relayer-Host': 'http://localhost:8014'
      };

      var options = {
        host: host,
        port: port,
        method: 'POST',
        headers: headers
      };

      var simpleServer = server.serverListener(function() {
        utils.makeRequest(options, JSON.stringify(content), function() {

        });
      }, function(method, headers, body) {
        method.should.equal('POST');
        JSON.stringify(headers).should.include(JSON.stringify(
            options.headers['content-type']));
        JSON.parse(body).content.should.include(content['content']);
        done();
      });

      serversToShutDown.push(simpleServer);
    });
  });

  describe('#PUT', function() {
    it('Should return the same headers, method and body', function(done) {
      var content = {
        content: 'Hello World'
      };

      var headers = {
        'content-type': 'application/json',
        'X-Relayer-Host': 'http://localhost:8014'
      };

      var options = {
        host: host,
        port: port,
        method: 'PUT',
        headers: headers
      };

      var simpleServer = server.serverListener(function() {
        utils.makeRequest(options, JSON.stringify(content), function() {
        });
      }, function(method, headers, body) {
        method.should.equal('PUT');
        JSON.stringify(headers).should.include(JSON.stringify(
            options.headers['content-type']));
        JSON.parse(body).content.should.include(content['content']);
        done();
      });

      serversToShutDown.push(simpleServer);
    });
  });

  describe('#DELETE', function() {
    it('Should return the same headers and the same method', function(done) {
      var headers = {
        'X-Relayer-Host': 'http://localhost:8014'
      };

      var options = {
        host: host,
        port: port,
        method: 'DELETE',
        headers: headers
      };

      var simpleServer = server.serverListener(function() {
        utils.makeRequest(options, undefined, function() {
        });
      }, function(method, headers, body) {
        method.should.equal('DELETE');
        done();
      });

      serversToShutDown.push(simpleServer);
    });
  });
});
