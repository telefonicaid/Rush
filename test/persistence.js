/**
 * Created with JetBrains WebStorm.
 * User: fernando
 * Date: 15/10/12
 * Time: 11:02
 * To change this template use File | Settings | File Templates.
 */

var should = require('should');
var server = require('./simpleServer.js');
var utils = require('./utils.js');

options = {};
options.host = 'localhost';
options.port = 8030;
options.headers = {};

describe('Persistence', function () {
    describe('#GET', function () {
        var options = this.options;
        options.method = 'GET';
        options.headers['content-type'] = 'application/json';
        options.headers['X-Relayer-Host'] = 'http://localhost:8014';
        options.headers['X-relayer-persistence'] = 'BODY';
        options.headers['test-header'] = 'test header';

        it('should return empty body and test-header', function (done) {
            var id;
            server.serverListener(
                function () {
                    utils.makeRequest(options, '', function (err, res) {
                        id = res;
                        console.log(id);
                    });
                },
                function (method, headers, body) {
                    var options = { port: 8030, host: 'localhost', path: '/response/' + id, method: 'GET'};
                    setTimeout(function () {
                        utils.makeRequest(options, '', function (err, res) {
                            var JSONres = JSON.parse(res);
                            JSONres.body.should.be.equal('');
                            JSON.parse(JSONres.headers).should.have.property('test-header', 'test header');
                            done();
                        });
                    }, 100); //Waiting for Rush to create the persistence
                }
            );
        });
        options.method = 'POST';
        it('should return the same body', function (done) {
            var id;
            server.serverListener(
                function () {
                    utils.makeRequest(options, 'body request', function (err, res) {
                        id = res;
                        console.log(id);
                    });
                },
                function (method, headers, body) {
                    var options = { port: 8030, host: 'localhost', path: '/response/' + id, method: 'GET'};
                    setTimeout(function () {
                        utils.makeRequest(options, '', function (err, res) {
                            var JSONres = JSON.parse(res);
                            JSONres.body.should.be.equal('body request');
                            done();
                        });
                    }, 100); //Waiting for Rush to create the persistence
                }
            );
        });
        options.headers['X-relayer-persistence'] = 'BODY';
        it('should not return body neither headers', function (done) {
            var id;
            server.serverListener(
                function () {
                    utils.makeRequest(options, 'body request', function (err, res) {
                        id = res;
                        console.log(id);
                    });
                },
                function (method, headers, body) {
                    var options = { port: 8030, host: 'localhost', path: '/response/' + id, method: 'GET'};
                    setTimeout(function () {
                        utils.makeRequest(options, '', function (err, res) {
                            var JSONres = JSON.parse(res);
                            JSONres.body.should.be.equal('body request');
                            done();
                        });
                    }, 100); //Waiting for Rush to create the persistence
                }
            );
        });
    });
});