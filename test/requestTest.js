var http = require('http');
var should = require('should');
var config = require('./config.js');
var server = require('./simpleServer.js');
var utils = require('./utils.js');

var options = {};
options.host = 'localhost';
options.port = 3001;
options.method = 'POST';
options.headers = {};
options.headers['content-type'] = 'application/json';
//options.headers['x-relayer-httpcallback'] = httpcallback;



describe('Request Test',function(){
    it('Should return protocol error(test 1)',function(done){
        options.headers['X-Relayer-Host'] = 'localhost:3001';
        utils.makeRequest(options,'Protocol error test', function(e,data){
            JSON.parse(data).errors[0].should.be.equal('Invalid protocol localhost:3001');
            done();
        });
    });


    it('Should return protocol error (test 2)',function(done){
        options.headers['X-Relayer-Host'] = 'no protocol';
        utils.makeRequest(options,'Protocol error test', function(e,data){
            JSON.parse(data).errors[0].should.be.equal('Invalid protocol no protocol');
            done();
        });
    });


    it('Should return invalid host error (test 3)',function(done){
        options.headers['X-Relayer-Host'] = 'http://';
        utils.makeRequest(options,'host error test', function(e,data){
            JSON.parse(data).errors[0].should.be.equal('Host not specify');
            done();
        });
    });


    it('Should return invalid host error (test 4)',function(done){
        options.headers['X-Relayer-Host'] = 'https://';
        utils.makeRequest(options,'host error test', function(e,data){
            JSON.parse(data).errors[0].should.be.equal('Host not specify');
            done();
        });
    });


    it('Should return X-Relayer-Host missing error',function(done){
        delete options.headers['X-Relayer-Host'];
        utils.makeRequest(options,'X-Relayer-Host missing test', function(e,data){
             JSON.parse(data).errors[0].should.be.equal('x-relayer-host is missing');
            done();
        });
    });




});
