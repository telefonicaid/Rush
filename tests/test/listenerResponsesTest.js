var http = require('http');
var should = require('should');
var config = require('./config.js');
var server = require('./simpleServer.js');
var utils = require('./utils.js');

describe('errors Test', function() {

  var options;

  beforeEach(function(done) {
    options = {};
    options.host = 'localhost';
    options.port = 3001;
    options.method = 'POST';
    options.headers = {};
    options.headers['content-type'] = 'application/json';

    done();
  });

  it('Should return protocol error(test 1)', function(done) {
    options.headers['X-Relayer-Host'] = 'localhost:3001';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {
      JSON.parse(data).errors[0].should.be.equal(
          'Invalid protocol localhost:3001');
      done();
    });
  });


  it('Should return protocol error (test 2)', function(done) {
    options.headers['X-Relayer-Host'] = 'no protocol';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {
      JSON.parse(data).errors[0].should.be.equal(
          'Invalid protocol no protocol');
      done();
    });
  });


  it('Should return invalid host error (test 3)', function(done) {
    options.headers['X-Relayer-Host'] = 'http://';
    utils.makeRequest(options, 'host error test', function(e, data) {
      JSON.parse(data).errors[0].should.be.equal(
          'Hostname expected. Empty host after protocol');
      done();
    });
  });


  it('Should return invalid host error (test 4)', function(done) {
    options.headers['X-Relayer-Host'] = 'https://';
    utils.makeRequest(options, 'host error test', function(e, data) {
      JSON.parse(data).errors[0].should.be.equal(
          'Hostname expected. Empty host after protocol');
      done();
    });
  });

  it('Should return invalid host error (test 5)', function(done) {
    options.headers['X-Relayer-Host'] = 'http://:8888';
    utils.makeRequest(options, 'host error test', function(e, data) {
      JSON.parse(data).errors[0].should.be.equal(
          'Hostname expected. Empty host after protocol');
      done();
    });
  });


  it('Should return X-Relayer-Host missing error', function(done) {
    delete options.headers['X-Relayer-Host'];
    utils.makeRequest(options, 'X-Relayer-Host missing test',
        function(e, data) {
      JSON.parse(data).errors[0].should.be.equal(
          'x-relayer-host is missing');
      done();
    });
  });

  it('Should return invialid protocol', function(done) {
    options.headers['X-Relayer-Host'] = 'ftp://localhost:3001';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {
      JSON.parse(data).errors[0].should.be.equal(
          'Invalid protocol ftp://localhost:3001');
      done();
    });
  });

  it('Should not return an error. Should return and ID', function(done) {
    options.headers['X-Relayer-Host'] = 'http://localhost:3001';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {
      var parsedJSON = JSON.parse(data);
      parsedJSON.should.have.property('id');
      parsedJSON.should.not.have.property('errors');
      parsedJSON.should.have.property('ok', true);
      done();
    });
  });

  it('Should not return an error. Should return and ID', function(done) {
    options.headers['X-Relayer-Host'] = 'https://localhost:3001';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {
      var parsedJSON = JSON.parse(data);
      parsedJSON.should.have.property('id');
      parsedJSON.should.not.have.property('errors');
      parsedJSON.should.have.property('ok', true);
      done();
    });
  });

  it('Should not return an error. Should return and ID', function(done) {
    options.headers['X-Relayer-Host'] = 'http://localhost';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {
      var parsedJSON = JSON.parse(data);
      parsedJSON.should.have.property('id');
      parsedJSON.should.not.have.property('errors');
      parsedJSON.should.have.property('ok', true);
      done();
    });
  });

  it('Should not return an error. Should return and ID', function(done) {
    options.headers['X-Relayer-Host'] = 'https://localhost';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {
      var parsedJSON = JSON.parse(data);
      parsedJSON.should.have.property('id');
      parsedJSON.should.not.have.property('errors');
      parsedJSON.should.have.property('ok', true);
      done();
    });
  });

  it('invalid persistence type should throw error', function(done) {
    var id;

    var options2 = options;
    options2.headers['X-Relayer-Host'] = 'http://notAServer:8014';
    options2.headers['X-Relayer-Persistence'] = 'INVALID';

    utils.makeRequest(options2, 'body request', function(err, res) {
      should.not.exist(err);
      var jsonRes = JSON.parse(res);
      jsonRes.should.have.property('ok', false);
      jsonRes.should.have.property('errors');
      jsonRes.errors.should.include('invalid persistence type: INVALID');
      done();
    });
  });

  it('invalid retry parameter should throw error', function(done) {
    var id;
    options.headers['X-Relayer-Host'] = 'http://notAServer:8014';
    options.headers['X-Relayer-Retry'] = '5-7,4,8';

    utils.makeRequest(options, 'body request', function(err, res) {
      should.not.exist(err);
      var jsonRes = JSON.parse(res);
      jsonRes.should.have.property('ok', false);
      jsonRes.should.have.property('errors');
      jsonRes.errors.should.include('invalid retry value: 5-7,4,8');
      done();
    });
  });

  it('invalid httpcallback should throw error', function(done) {
    var id;
    options.headers['X-Relayer-Host'] = 'http://notAServer:8014';
    options.headers['X-Relayer-httpcallback'] = 'http://';

    utils.makeRequest(options, 'body request', function(err, res) {
      should.not.exist(err);
      var jsonRes = JSON.parse(res);
      jsonRes.should.have.property('ok', false);
      jsonRes.should.have.property('errors');
      jsonRes.errors.should.include('Hostname expected.' +
          ' Empty host after protocol');
      done();
    });
  });

  it('invalid httpcallback should throw error', function(done) {
    var id;
    options.headers['X-Relayer-Host'] = 'http://notAServer:8014';
    options.headers['X-Relayer-httpcallback'] = 'localhost:8000';

    utils.makeRequest(options, 'body request', function(err, res) {
      should.not.exist(err);
      var jsonRes = JSON.parse(res);
      jsonRes.should.have.property('ok', false);
      jsonRes.should.have.property('errors');
      jsonRes.errors.should.include('Invalid protocol localhost:8000');
      done();
    });
  });
});
