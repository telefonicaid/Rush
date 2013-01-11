var should = require('should');
var server = require('./simpleServer.js');
var utils = require('./utils.js');
var async = require('async');

options = {};
options.host = 'localhost';
options.port = 3001;
options.headers = {};

var serversToShutDown = [];

describe('Persistence', function () {

    afterEach(function() {
        for (var i = 0; i < serversToShutDown.length; i++) {
            try {
                serversToShutDown[i].close();
            } catch (e) {

            }
        }

        serversToShutDown = [];
    });

    var options = this.options;
    options.method = 'GET';
    options.headers['content-type'] = 'application/json';
    options.headers['X-Relayer-Host'] = 'http://localhost:8014';
    options.headers['X-relayer-persistence'] = 'BODY';
    options.headers['test-header'] = 'test header';

    it('should return empty body and test-header', function (done) {
        var id;
        var simpleServer = server.serverListener(
            function () {
                utils.makeRequest(options, '', function (err, res) {
                    id = JSON.parse(res).id;
                });
            },
            function (method, headers, body) {
                setTimeout(function () {
                    var options = { port: 3001, host: 'localhost', path: '/response/' + id, method: 'GET'};
                    utils.makeRequest(options, '', function (err, res) {

                        var JSONres = JSON.parse(res);
                        JSONres.body.should.be.equal('');
                        JSONres.headers.should.have.property('test-header', 'test header');
                        done();
                    });
                }, 100); //Waiting for Rush to create the persistence
            }
        );

        serversToShutDown.push(simpleServer);
    });

    it('should return the same body', function (done) {
        options.method = 'POST';
        var id;
        var simpleServer = server.serverListener(
            function () {
                utils.makeRequest(options, 'body request', function (err, res) {
                    id = JSON.parse(res).id;
                });
            },
            function (method, headers, body) {
                setTimeout(function () {
                    var options = { port: 3001, host: 'localhost', path: '/response/' + id, method: 'GET'};
                    utils.makeRequest(options, '', function (err, res) {
                        var JSONres = JSON.parse(res);
                        JSONres.body.should.be.equal('body request');
                        done();
                    });
                }, 100); //Waiting for Rush to create the persistence
            }
        );

        serversToShutDown.push(simpleServer);

    });

    it('should not return body neither headers', function (done) {
        options.headers['X-relayer-persistence'] = 'STATUS';
        var id;
        var simpleServer = server.serverListener(
            function () {
                utils.makeRequest(options, 'body request', function (err, res) {
                    id = JSON.parse(res).id;
                });
            },
            function (method, headers, body) {
                setTimeout(function () {
                    var options = { port: 3001, host: 'localhost', path: '/response/' + id, method: 'GET'};
                    utils.makeRequest(options, '', function (err, res) {
                        var JSONres = JSON.parse(res);
                        JSONres.should.not.have.property('body');
                        JSONres.should.not.have.property('headers');
                        done();
                    });
                }, 100); //Waiting for Rush to create the persistence
            }
        );

        serversToShutDown.push(simpleServer);
    });
    it('should return error headers (ENOTFOUND)', function (done) {
        var id;
        options.headers['X-Relayer-Host'] = 'http://notAServer:8014';
        async.series([
            function (callback) {
                utils.makeRequest(options, 'body request', function (err, res) {
                    id = JSON.parse(res).id;
                    if (!err) {
                        callback(null, res);
                    }
                    else {
                        callback(err, null);
                    }
                });
            },
            function (callback) {
                setTimeout(function () {
                    var options = { port: 3001, host: 'localhost', path: '/response/' + id, method: 'GET'};
                    utils.makeRequest(options, '', function (err, res) {
                        if (!err) {
                            var JSONres = JSON.parse(res);
                            callback(null, JSONres);
                        }
                        else {
                            callback(err, null);
                        }
                    });
                }, 400);
            }
        ], function (err, res) {
            var resGet = res[1];
            resGet.should.have.property('error', 'ENOTFOUND(getaddrinfo)');
            done();
        });
    });
});