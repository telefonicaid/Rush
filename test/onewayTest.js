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
var server = require('./simplyServer.js');
var utils = require('./utils.js');

var host = config.hostname;
var port = config.port;

describe('Oneway', function () {


    it('Should return the id and the same body', function (done) {
        var content = {
            content: 'hola mundo'
        }

        var headers = {
            'content-type': 'application/json',
            'X-Relayer-Host': 'http://localhost:8014',
            'X-relayer-persistence': 'BODY'
        }

        var options = {
            host: host,
            port: port,
            method:'POST',
            headers: headers
        }

        server.serverListener(function () {
            utils.postObj(options, JSON.stringify(content), function () {
            });
        }, function (headers, body) {
            JSON.stringify(headers).should.include(JSON.stringify(options.headers['content-type']));
            JSON.stringify(headers).should.include(JSON.stringify(options.headers['X-Relayer-Host']));
            JSON.stringify(headers).should.include(JSON.stringify(options.headers['X-relayer-persistence']));
            JSON.parse(body).content.should.include(content['content']);
            done();
        });
    });
});