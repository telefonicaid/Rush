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

var options = {};
options.host = 'localhost';
options.port = 8030;
options.headers = {};

describe('Persistence', function () {
    describe('#GET', function () {
        var options = options;
        options.method = 'GET';
        options.headers['content-type'] = 'application/json';
        options.headers['X-Relayer-Host'] = 'http://localhost:8014';
        options.headers['X-relayer-persistence'] = 'BODY';

        it('should return an empty body', function (done) {
            var id;
            server.serverListener(
                function () {
                    console.log('hola');
                    utils.postObj(options, null, function (err, res) {
                        id = res;
                    });
                },
                function (headers, body) {
                    console.log(body);
                    var options = { port: 8030, host: 'localhost', path: '/responses/' + id, method: 'GET'};
                    utils.postObj(options, null, function (err, res) {

                    });
                }
            );
        });
    });
});