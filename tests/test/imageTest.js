var should = require('should');
var utils = require('./utils.js');
var http = require('http');
var fs=require('fs');
var config = require('./config');
var path = require('path');
var DIR_MODULE = path.dirname(module.filename);




describe('Image Test',function(){
    var srv;
    beforeEach(function(done){
        srv = http.createServer(function (req, res) {
            var content = fs.readFileSync(DIR_MODULE+'/smiley.png');

            req.on('end', function () {
                console.log('llega algo')
                res.writeHead(200);
                res.end(content);
                req.destroy();
            });

        }).listen(config.simpleServerPort,done);
    });

    afterEach(function(done){
        srv.close();
        done();
    });

    it ('should return the same bytes',function(){
        var options = {};
        options.host = 'localhost';
        options.port = 3001;
        options.headers = {};
        options.method = 'GET';
        options.headers['content-type'] = 'application/json';
        options.headers['X-Relayer-Host'] = 'http://localhost:8014';
        options.headers['X-relayer-persistence'] = 'BODY';
        options.headers['X-relayer-encoding'] = 'base64';

        utils.makeRequest(options,'',function(err,res){
            var content = fs.readFileSync(DIR_MODULE+'/smiley.png');
            console.log(res);
            done();
        });


    });
    });







