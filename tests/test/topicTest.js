/**
 * Created with JetBrains WebStorm.
 * User: oelmaallem
 * Date: 19/10/12
 * Time: 10:50
 * To change this template use File | Settings | File Templates.
 */

var should = require('should');
var server = require('./simpleServer.js');
var utils = require('./utils.js');
var async = require('async');

options = {};
options.host = 'localhost';
options.port = 3001;
options.headers = {};

describe('Topic', function () {
    var options = this.options;
    options.method = 'GET';
    options.headers['content-type'] = 'application/json';
    options.headers['X-Relayer-Host'] = 'http://localhost:8014';
    options.headers['X-relayer-persistence'] = 'BODY';
    options.headers['test-header'] = 'test header';
    options.headers['X-Relayer-topic'] ='Topic test';



    it('should return empty body and test-header', function (done) {
        var id;
        server.serverListener(
            function () {
                utils.makeRequest(options, '', function (err, res) {
                    id = JSON.parse(res).id;
                    //console.log(id);
                });
            },
            function (method, headers, body) {
                setTimeout(function () {
                    var options = { port: 3001, host: 'localhost', path: '/response/' + id, method: 'GET'};
                    utils.makeRequest(options, '', function (err, res) {

                        var JSONres = JSON.parse(res);
                        JSONres.body.should.be.equal('');
                        JSON.parse(JSONres.headers).should.have.property('test-header', 'test header');
                        JSONres.should.have.property('topic','Topic test');
                        done();
                    });
                }, 100); //Waiting for Rush to create the persistence
            }
        );
    });



    it('should return the same body', function (done) {
        options.method = 'POST';
        var id;
        server.serverListener(
            function () {
                utils.makeRequest(options, 'body request', function (err, res) {
                    id = JSON.parse(res).id;
                    //console.log(id);
                });
            },
            function (method, headers, body) {
                setTimeout(function () {
                    var options = { port: 3001, host: 'localhost', path: '/response/' + id, method: 'GET'};
                    utils.makeRequest(options, '', function (err, res) {
                        var JSONres = JSON.parse(res);
                        JSONres.body.should.be.equal('body request');
                        JSONres.should.have.property('topic', 'Topic test');
                        done();
                    });
                }, 100); //Waiting for Rush to create the persistence
            }
        );
    });


    it('should not return body neither headers', function (done) {
        options.headers['X-relayer-persistence'] = 'STATUS';
        var id;
        server.serverListener(
            function () {
                utils.makeRequest(options, 'body request', function (err, res) {
                    id = JSON.parse(res).id;
                   // console.log(id);
                });
            },
            function (method, headers, body) {
                setTimeout(function () {
                    var options = { port: 3001, host: 'localhost', path: '/response/' + id, method: 'GET'};
                    utils.makeRequest(options, '', function (err, res) {
                        var JSONres = JSON.parse(res);
                        JSONres.should.not.have.property('body');
                        JSONres.should.not.have.property('headers');
                        JSONres.should.have.property('topic', 'Topic test');
                        done();
                    });
                }, 100); //Waiting for Rush to create the persistence
            }
        );
    });


    it('should not return body neither headers', function (done) {
        var id;
        options.headers['X-Relayer-Host'] = 'http://notAServer:8014';
        async.series([
            function (callback) {
                utils.makeRequest(options, 'body request', function (err, res) {
                    id = JSON.parse(res).id;
                   // console.log(id);
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
            resGet.should.have.property('resultOk', 'false');
            done();
        });
    });
});
