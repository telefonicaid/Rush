var chai = require('chai');
var superagent = require('superagent');
var config = require('./config.js');
var redis = require('redis');

var expect = chai.expect;

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

var REDIS_HOST = config.redisServer.host;
var REDIS_PORT = config.redisServer.port;

var URL_RUSH = 'http://' + HOST + ':' + PORT;
var ENDPOINT = config.externalEndpoint;
var QUEUE = "wrL:hpri"; //Task

describe('ISSUE #113', function () {
  var agent = superagent.agent();
  var rc = redis.createClient(REDIS_PORT, REDIS_HOST);
  rc.flushall();

  it("Task should not contain x-relayer-persistence", function(done){
    agent
      .get(URL_RUSH)
      .set('x-relayer-host', ENDPOINT)  //Always the same endpoint
      .set('x-relayer-persistence', "")
      .end(function(err, res) {
        expect(err).to.not.exist;
        expect(res.statusCode).to.equal(200); //Status code 200
        expect(res.body).to.exist;
        expect(res.body.id).to.exist;

        var transId = res.body.id;
        rc.lpop(QUEUE, function(err, res){
          expect(err).to.not.exist;

          var task = JSON.parse(res);
          expect(task.id).to.equal(transId);
          expect(task).to.have.property('headers');
          expect(task.headers).to.not.have.property('x-relayer-persistence');

          done();
        });
      });
  });
});