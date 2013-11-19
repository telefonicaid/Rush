var should = require('should');
var superagent = require('superagent');
var config = require('./config');
var chai = require('chai');
var expect = chai.expect;
var _ = require('underscore');
var async = require('async');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;
var secure= 'http://';
var RUSHENDPOINT = secure + HOST;

// Verbose MODE
var vm = false;
// extra verbose MODE
var vm2 = false;

//Accept self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

//TOKEN CONFIG
var TOKEN = config.token;

if (!TOKEN) {
  TOKEN='';
} else {
  TOKEN= 'Bearer ' + TOKEN;
  console.log(TOKEN);
}

//USER CONFIG
var USER = config.user;
var Pass;
if (!USER) {
  USER='';
  Pass='';
} else {
  var tmp= USER;
  var re = /(\w+)\:(\w+)/;
  //var Pass = tmp.replace(re,  '$2, $1 ');
  var USER= tmp.replace(re,  '$1 ');
  var Pass = tmp.replace(re,  '$2 ');

  if (vm) {
    console.log(  '\n User and Pass  ' + USER + ' and ' + Pass );
  }
}

//SECURE URL CONFIG
if (PORT === 443) {
  secure= 'https://';
  RUSHENDPOINT = secure + HOST;
} else {
  RUSHENDPOINT = secure + HOST+ ':' + PORT;
}

var ENDPOINT = config.externalEndpoint;
if (!ENDPOINT){
  ENDPOINT = 'www.google.es';
}

// Endpoint for smoke test or simulated
var realEP = false;

// Time to wait to check the status of the task
var TIMEOUT = 1000;
var CREATED = 201; // 200 for older versions
var describeTimeout = 60000;
var timeout2= 30000;
var DELAY = 3000;

function _validScenario(data, i){
  'use strict';

  it(data.name, function(done){
    var agent = superagent.agent();
    agent
        [data.method.toLowerCase()](RUSHENDPOINT )
        .set('x-relayer-host', ENDPOINT)  //Always the same endpoint
        .set('x-relayer-persistence','BODY')
        .set('Authorization', TOKEN)
        .set(data.headers)
        .send({})
        .auth(USER,Pass)
        .end(function(err, res) {
          if (vm2) {console.log(res);}
          expect(err).to.not.exist;
          expect(res.statusCode).to.equal(CREATED); //Status code 200
          if (vm) {console.log(res.body.id);}
          expect(res.body).to.exist;
          expect(res.body.id).to.exist;
          res.text.should.not.include('exception');
          var transId = res.body.id;
          setTimeout(function () {
            agent
                .get(RUSHENDPOINT +'/response/' + res.body['id'])
                .set('Authorization', TOKEN)
                .auth(USER,Pass)
                .end(function onResponse2(err2, res2) {
                  if (vm2) {console.log(res2);}
                  if (vm) {console.log(res2.body);}
                  expect(res2.statusCode).to.equal(200);
                  res2.headers['content-type'].should.eql('application/json; charset=utf-8');
                  res2.text.should.include('id');
                  res2.text.should.include('state');
                  if (realEP){
                    res2.body['state'].should.eql('completed');
                    res2.text.should.not.include('exception');
                  }
                  if (data.headers['x-relayer-traceid']) {
                    res2.body['traceID'].should.eql('TEST');
                  }
                  done();
                });
          }, TIMEOUT);
        });
  });
}

function _invalidScenario(data, i) {
  'use strict';

  it(data.name, function (done) {
    var agent = superagent.agent();
    agent
        [data.method.toLowerCase()](RUSHENDPOINT)
        .set('x-relayer-host', ENDPOINT)  //Always the same endpoint
                  .set(data.headers)      .auth(USER,Pass)
        .end(function (err, res) {
          should.not.exist(err);
          res.should.have.status(400);
          res.text.should.not.include( 'ok ');
          should.exist(res.body['exceptionId']);

          if (data.headers['x-relayer-persistence']) {  //checks for invalid persistance
            res.body['exceptionId'].should.eql('SVC0003');
            res.body['exceptionText'].should.eql('Invalid parameter value: x-relayer-persistence. ' +
                'Possible values are: BODY, STATUS, HEADER');
          }
          else {
            res.body['exceptionId'].should.eql('SVC0002');
            res.body['exceptionText'].should.exist;
            if (data.headers['x-relayer-httpcallback']) {  //checks for invalid callback
              res.body['exceptionText'].should.eql('Invalid parameter value: x-relayer-httpcallback');
            }
            if (data.headers['x-relayer-httpcallback-error']) {  //checks for invalid callback
              res.body['exceptionText'].should.eql('Invalid parameter value: x-relayer-httpcallback-error');
            }
            if (data.headers['x-relayer-retry']) {  //checks for invalid retry
              res.body['exceptionText'].should.eql('Invalid parameter value: x-relayer-retry');
            }
            if (data.headers['x-relayer-proxy']) {  //checks for invalid proxy
              res.body['exceptionText'].should.eql('Invalid parameter value: x-relayer-proxy');
              console.log( '\n+++++Issue Resolved++++++++\n ');
            }
            if (data.headers['x-relayer-traceid']) {  //checks for invalid traceid
              // It is possible to have a invalid traceid?
              res.body['exceptionText'].should.eql('Invalid parameter value: x-relayer-traceid');
            }
            if (data.headers['x-relayer-encoding']) {  //checks for invalid encoding
              res.body['exceptionText'].should.eql('Invalid parameter value: x-relayer-encoding');
              console.log( '\n+++++Issue Resolved++++++++\n ');
            }
          }
          if (vm) {
            console.log(res.body);
          }
          done();
        });
  });
}



describe('Scenario: Basic acceptance tests for Rush as a Service ', function () {
  'use strict';

  if (vm) {
    console.log('Endpoint to check deployment' , RUSHENDPOINT);
    console.log('Target Endpoint' , ENDPOINT);
  }
  var ids = [];


  describe('/ADD http requests ', function () {
    this.timeout(timeout2);
    describe('with a valid Endpoint and Headers', function () {
      var agent = superagent.agent();

      it('should accept requests using / POST', function (done) {

        function onResponse(err, res) {
          //console.log(agent);
          should.not.exist(err);
          res.headers['content-type'].should.eql('application/json; charset=utf-8');
          ids.push(res.body['id']);
          res.should.have.status(CREATED);
          res.text.should.include('id');
          return done();
        }

        agent
            .post(RUSHENDPOINT)
            .set('X-relayer-host', ENDPOINT)
            .set('Authorization', TOKEN)
            .auth(USER,Pass)
            .send({})
            .end(onResponse);
      });

      it('should accept requests using / GET', function (done) {

        function onResponse(err, res) {
          //console.log(agent);
          should.not.exist(err);
          res.headers['content-type'].should.eql('application/json; charset=utf-8');
          ids.push(res.body['id']);
          res.should.have.status(CREATED);
          res.text.should.include('id');
          return done();
        }

        agent
            .get(RUSHENDPOINT )
            .set('X-relayer-host', ENDPOINT)
            .set('Authorization', TOKEN)
            .auth(USER,Pass)
            .send({})
            .end(onResponse);
      });

      it('should accept requests using / PUT', function (done) {

        function onResponse(err, res) {
          //console.log(agent);
          should.not.exist(err);
          res.headers['x-powered-by'].should.eql('Express');
          res.headers['content-type'].should.eql('application/json; charset=utf-8');
          ids.push(res.body['id']);
          res.should.have.status(CREATED);
          res.text.should.include('id');
          return done();
        }

        agent
            .put(RUSHENDPOINT)
            .set('X-relayer-host', ENDPOINT)
            .set('Authorization', TOKEN)
            .auth(USER,Pass)
            .send({})
            .end(onResponse);
      });

      it('should accept requests using / OPTIONS', function (done) {

        function onResponse(err, res) {
          //console.log(agent);
          should.not.exist(err);
          res.headers['content-type'].should.eql('application/json; charset=utf-8');
          ids.push(res.body['id']);
          res.should.have.status(CREATED);
          res.text.should.include('id');
          return done();
        }

        agent
            .options(RUSHENDPOINT)
            .set('X-relayer-host', ENDPOINT)
            .set('Authorization', TOKEN)
            .auth(USER,Pass)
            .send({})
            .end(onResponse);
      });

      //BAD GATE ERROR ON APIGEE - HTTPS RUSH ENDPOINT
/*      it.skip('should accept requests using / TRACE', function (done) {
        agent
            .trace(RUSHENDPOINT)
            .set('X-relayer-host', ENDPOINT)
            .set('Authorization', TOKEN)
                      .auth(USER,Pass)
            .send({})
            .end(onResponse);

        function onResponse(err, res) {
          //console.log(agent);
          should.not.exist(err);
          res.headers['content-type'].should.eql('application/json');
          //check
          ids.push(res.body['id']);
          //console.log(res.body['id']);
          res.should.have.status(CREATED);
          res.text.should.include('id');
          return done();
        }
      });
*/
      it('should NOT accept requests using / HEAD', function (done) {

        function onResponse(err, res) {
          //console.log(agent);
          should.not.exist(err);
          res.headers['content-type'].should.eql('application/json; charset=utf-8');
          ids.push(res.body['id']);
          res.should.have.status(CREATED);
          res.text.should.not.include('id');
          return done();
        }

        agent
            .head(RUSHENDPOINT)
            .set('X-relayer-host', ENDPOINT)
            .set('Authorization', TOKEN)
            .auth(USER,Pass)
            .end(onResponse);
      });

    });

  });

  describe('Protocol acceptance', function(){
    this.timeout(timeout2);
    var agent = superagent.agent();

    it('should accept HTTP requests', function (done) {

      function onResponse(err, res) {
        //console.log(agent);
        should.not.exist(err);
        res.headers['content-type'].should.eql('application/json; charset=utf-8');
        ids.push(res.body['id']);
        res.should.have.status(CREATED);
        return done();
      }

      agent
          .post(RUSHENDPOINT)
          .set('X-Relayer-Host', 'ENDPOINT')
          .set('X-Relayer-Protocol', 'http')
          .set('Authorization', TOKEN)
          .auth(USER,Pass)
          .send({})
          .end(onResponse);
    });

    it('should accept HTTPS requests', function (done) {

      function onResponse(err, res) {
        //console.log(agent);
        should.not.exist(err);
        res.headers['content-type'].should.eql('application/json; charset=utf-8');
        ids.push(res.body['id']);
        res.should.have.status(CREATED);
        return done();
      }

      agent
          .post(RUSHENDPOINT)
          .set('X-Relayer-Host', 'ENDPOINT')
          .set('X-Relayer-Protocol', 'https')
          .set('Authorization', TOKEN)
          .auth(USER,Pass)
          .send({})
          .end(onResponse);
    });

    it('should NOT accept FTP requests', function (done) {

      function onResponse(err, res) {
        //console.log(agent);

        should.not.exist(err);
        res.should.have.status(400);
        res.text.should.not.include( 'ok ');
        should.exist(res.body['exceptionId']);
        res.body['exceptionId'].should.eql('SVC0003');
        res.body['exceptionText'].should.eql('Invalid parameter value: x-relayer-protocol. ' +
            'Possible values are: http, https');
        return done();
      }

      agent
          .post(RUSHENDPOINT)
          .set('X-Relayer-Host', 'ENDPOINT')
          .set('X-Relayer-Protocol', 'ftp')
          .set('Authorization', TOKEN)
          .auth(USER,Pass)
          .send({})
          .end(onResponse);
    });
  });


  describe('/Retrieve processed requests', function () {
    this.timeout(timeout2);
    describe('with valid Endpoint and parameters', function () {
      var agent = superagent.agent();

      it('should return the completed task using / POST', function (done) {

        function onResponse(err, res) {
          should.not.exist(err);
          //console.log(res);
          ids.push(res.body['id']);
          res.headers['content-type'].should.eql('application/json; charset=utf-8');
          res.should.have.status(CREATED);
          res.text.should.include('id');
          if (vm){console.log(res.body['id']);}
          //console.log(res);
          setTimeout(function () {
            agent
                .get(RUSHENDPOINT +'/response/' + ids[0])
                .set('Authorization', TOKEN)
                .auth(USER,Pass)
                .end(
                function onResponse2(err2, res2) {
                  //console.log( '/n/n ',res2)
                  if (vm){console.log( '***BODY*** ',res2.body);}
                  res2.should.have.status(200);
                  res2.text.should.include('id');
                  res2.headers['content-type'].should.eql('application/json; charset=utf-8');
                  return done();
                });
          }, DELAY);
        }

        agent
            .post(RUSHENDPOINT)
            .set('X-relayer-host', ENDPOINT)
            .set('X-relayer-persistence', 'BODY')
            .set('Authorization', TOKEN)
            .auth(USER,Pass)
            .send({})
            .end(onResponse);
      });

      it('should return the completed task using / GET', function (done) {

        function onResponse(err, res) {
          //console.log(agent);
          should.not.exist(err);
          ids.push(res.body['id']);
          res.headers['content-type'].should.eql('application/json; charset=utf-8');
          res.should.have.status(CREATED);
          res.text.should.include('id');
          //console.log(res.body['id']);
          setTimeout(function () {
            agent
                .get(RUSHENDPOINT +'/response/' + ids[0])
                .set('Authorization', TOKEN)
                .auth(USER,Pass)
                .send({})
                .end(
                function onResponse2(err2, res2) {
                  //console.log( '***CHECK POINT*** ',res2.body['id'])
                  if (vm){console.log( '***BODY*** ',res2.body);}
                  res2.headers['content-type'].should.eql('application/json; charset=utf-8');
                  res2.should.have.status(200);
                  res2.text.should.include('id');
                  ////res2.body['traceID'].should.eql('undefined');
                  return done();
                });
          }, TIMEOUT);
        }

        agent
            .get(RUSHENDPOINT)
            .set('X-relayer-host', ENDPOINT)
            .set('X-relayer-persistence', 'BODY')
            .set('Authorization', TOKEN)
            .auth(USER,Pass)
            .send({})
            .end(onResponse);

      });

      it('should return the completed task using / PUT', function (done) {

        function onResponse(err, res) {
          //console.log(agent);
          should.not.exist(err);
          ids.push(res.body['id']);
          res.headers['content-type'].should.eql('application/json; charset=utf-8');
          res.should.have.status(CREATED);
          res.text.should.include('id');
          //console.log(res.body['id']);
          setTimeout(function () {
            agent
                .get(RUSHENDPOINT +'/response/' + ids[0])
                .set('Authorization', TOKEN)
                .auth(USER,Pass)
                .send({})
                .end(
                function onResponse2(err2, res2) {
                  //console.log( '***CHECK POINT*** ',res2.body['id'])
                  if (vm){console.log( '***BODY*** ',res2.body);}
                  res2.headers['content-type'].should.eql('application/json; charset=utf-8');
                  res2.should.have.status(200);
                  res2.text.should.include('id');
                  ////res2.body['traceID'].should.eql('undefined');
                  return done();
                });
          }, TIMEOUT);
        }

        agent
            .put(RUSHENDPOINT)
            .set('X-relayer-host', ENDPOINT)
            .set('X-relayer-persistence', 'BODY')
            .set('Authorization', TOKEN)
            .auth(USER,Pass)
            .send({})
            .end(onResponse);

      });

      it('should return the completed task using / OPTIONS', function (done) {

        function onResponse(err, res) {
          //console.log(agent);
          should.not.exist(err);
          ids.push(res.body['id']);
          res.headers['content-type'].should.eql('application/json; charset=utf-8');
          res.should.have.status(CREATED);
          res.text.should.include('id');
          //console.log(res.body['id']);
          setTimeout(function () {
            agent
                .get(RUSHENDPOINT +'/response/' + ids[0])
                .set('Authorization', TOKEN)
                .auth(USER,Pass)
                .send({})
                .end(
                function onResponse2(err2, res2) {
                  //console.log( '***CHECK POINT*** ',res2.body['id'])
                  res2.headers['content-type'].should.eql('application/json; charset=utf-8');
                  res2.should.have.status(200);
                  res2.text.should.include('id');
                  //res2.body['traceID'].should.eql('undefined');
                  return done();
                });
          }, TIMEOUT);
        }

        agent
            .options(RUSHENDPOINT)
            .set('X-relayer-host', ENDPOINT)
            .set('X-relayer-persistence', 'BODY')
            .set('Authorization', TOKEN)
            .auth(USER,Pass)
            .send({})
            .end(onResponse);

      });

    });

  });

});


describe('ACCEPTANCE TESTS: EXTERNAL VALID SCENARIOS [AWS]', function () {
  'use strict';
  this.timeout(describeTimeout);


  describe('\nCheck single features: with a valid header policy request using method /GET', function () {



    var dataSetGET = [
      {method: 'GET', headers: {}, name :  'Oneway No header: Should accept the request and retrieve the result '},
      {method: 'GET', headers: { 'x-relayer-persistence ' :  'STATUS '},
        name :  'Persistance STATUS: Should accept the request and retrieve the stored status '},
      {method: 'GET', headers: { 'x-relayer-persistence ' :  'HEADER '},
        name :  'Persistance HEADER: Should accept the request and retrieve stored header '},
      {method: 'GET', headers: { 'x-relayer-persistence ' :  'BODY '},
        name :  'Persistance BODY: Should accept the request and retrieve the stored body '},
      {method: 'GET', headers: { 'x-relayer-httpcallback ' :  'http://noname.com '},
        name :  'Callback: Should accept the request and retrieve the completed task '},
      {method: 'GET', headers: { 'x-relayer-httpcallback-error ' :  'http://noname.com '},
        name :  'Error Callback: Should accept the request and retrieve the completed task '},
      {method: 'GET', headers: { 'x-relayer-retry ' :  '10, 20, 30 '},
        name :  'Retry: Should accept the request and retrieve the completed task '},
      {method: 'GET', headers: {'x-relayer-proxy' : 'proxy.com'},
        name :  'Proxy: Should accept the request and retrieve the completed task '},
      {method: 'GET', headers: {'x-relayer-encoding' : 'base64'},
        name :  'Encoding: Should accept the request and retrieve the completed task '},
      {method: 'GET', headers: {'x-relayer-traceid' : 'TEST'},
        name :  'TRACEID: Should accept the request and retrieve the traceid and the completed task '}
    ];

    for(var i=0; i < dataSetGET.length; i++){
      _validScenario(dataSetGET[i]);  //Launch every test in data set
    }
  });


  describe('\nCheck single features: with a valid header policy request using method /POST', function () {
    var dataSetPOST = [
      {method: 'POST', headers: {}, name :  'Oneway No header: Should accept the request and retrieve the result '},
      {method: 'POST', headers: { 'x-relayer-persistence ' :  'STATUS '},
        name :  'Persistance STATUS: Should accept the request and retrieve the stored status '},
      {method: 'POST', headers: { 'x-relayer-persistence ' :  'HEADER '},
        name :  'Persistance HEADER: Should accept the request and retrieve stored header '},
      {method: 'POST', headers: { 'x-relayer-persistence ' :  'BODY '},
        name :  'Persistance BODY: Should accept the request and retrieve the stored body '},
      {method: 'POST', headers: { 'x-relayer-httpcallback ' :  'http://noname.com '},
        name :  'Callback: Should accept the request and retrieve the completed task '},
      {method: 'POST', headers: { 'x-relayer-httpcallback-error ' :  'http://noname.com '},
        name :  'Error Callback: Should accept the request and retrieve the completed task '},
      {method: 'POST', headers: { 'x-relayer-retry ' :  '10, 20, 30 '},
        name :  'Retry: Should accept the request and retrieve the completed task '},
      {method: 'POST', headers: {'x-relayer-proxy' : 'proxy.com'},
        name :  'Proxy: Should accept the request and retrieve the completed task '},
      {method: 'POST', headers: {'x-relayer-encoding' : 'base64'},
        name :  'Encoding: Should accept the request and retrieve the completed task '},
      {method: 'POST', headers: {'x-relayer-traceid' : 'TEST'},
        name :  'TRACEID: Should accept the request and retrieve the traceid and the completed task '}
    ];

    for(var i=0; i < dataSetPOST.length; i++){
      _validScenario(dataSetPOST[i]);  //Launch every test in data set
    }

  });

  describe('\nCheck single features: with a valid header policy request using method /PUT', function () {
    var dataSetPUT = [
      {method: 'PUT', headers: {},
        name :  'Oneway No header: Should accept the request and retrieve the result '},
      {method: 'PUT', headers: { 'x-relayer-persistence ' :  'STATUS '},
        name :  'Persistance STATUS: Should accept the request and retrieve the stored status '},
      {method: 'PUT', headers: { 'x-relayer-persistence ' :  'HEADER '},
        name :  'Persistance HEADER: Should accept the request and retrieve stored header '},
      {method: 'PUT', headers: { 'x-relayer-persistence ' :  'BODY '},
        name :  'Persistance BODY: Should accept the request and retrieve the stored body '},
      {method: 'PUT', headers: { 'x-relayer-httpcallback ' :  'http://noname.com '},
        name :  'Callback: Should accept the request and retrieve the completed task '},
      {method: 'PUT', headers: { 'x-relayer-httpcallback-error ' :  'http://noname.com '},
        name :  'Error Callback: Should accept the request and retrieve the completed task '},
      {method: 'PUT', headers: { 'x-relayer-retry ' :  '10, 20, 30 '},
        name :  'Retry: Should accept the request and retrieve the completed task '},
      {method: 'PUT', headers: {'x-relayer-proxy' : 'proxy.com'},
        name :  'Proxy: Should accept the request and retrieve the completed task '},
      {method: 'PUT', headers: {'x-relayer-encoding' : 'base64'},
        name :  'Encoding: Should accept the request and retrieve the completed task '},
      {method: 'PUT', headers: {'x-relayer-traceid' : 'TEST'},
        name :  'TRACEID: Should accept the request and retrieve the traceid and the completed task '}
    ];


    for(var i=0; i < dataSetPUT.length; i++){
      _validScenario(dataSetPUT[i]);  //Launch every test in data set
    }
  });

  describe('\nCheck single features: with a valid header policy request using method /DELETE', function () {
    var dataSetDEL = [
      {method: 'DEL', headers: {}, name :  'Oneway No header: Should accept the request and retrieve the result '},
      {method: 'DEL', headers: { 'x-relayer-persistence ' :  'STATUS '},
        name :  'Persistance STATUS: Should accept the request and retrieve the stored status '},
      {method: 'DEL', headers: { 'x-relayer-persistence ' :  'HEADER '},
        name :  'Persistance HEADER: Should accept the request and retrieve stored header '},
      {method: 'DEL', headers: { 'x-relayer-persistence ' :  'BODY '},
        name :  'Persistance BODY: Should accept the request and retrieve the stored body '},
      {method: 'DEL', headers: { 'x-relayer-httpcallback ' :  'http://noname.com '},
        name :  'Callback: Should accept the request and retrieve the completed task '},
      {method: 'DEL', headers: { 'x-relayer-httpcallback-error ' :  'http://noname.com '},
        name :  'Error Callback: Should accept the request and retrieve the completed task '},
      {method: 'DEL', headers: { 'x-relayer-retry ' :  '10, 20, 30 '},
        name :  'Retry: Should accept the request and retrieve the completed task '},
      {method: 'DEL', headers: {'x-relayer-proxy' : 'proxy.com'},
        name :  'Proxy: Should accept the request and retrieve the completed task '},
      {method: 'DEL', headers: {'x-relayer-encoding' : 'base64'},
        name :  'Encoding: Should accept the request and retrieve the completed task '},
      {method: 'DEL', headers: {'x-relayer-traceid' : 'TEST'},
        name :  'TRACEID: Should accept the request and retrieve the traceid and the completed task '}
    ];

    for(var i=0; i < dataSetDEL.length; i++){
      _validScenario(dataSetDEL[i]);  //Launch every test in data set
    }
  });

  describe('\nCheck single features: with a valid header policy request using method /OPTIONS', function () {
    var dataSetOPTIONS = [
      {method: 'OPTIONS', headers: {}, name :  'Oneway No header: Should accept the request and retrieve the result '},
      {method: 'OPTIONS', headers: { 'x-relayer-persistence ' :  'STATUS '},
        name :  'Persistance STATUS: Should accept the request and retrieve the stored status '},
      {method: 'OPTIONS', headers: { 'x-relayer-persistence ' :  'HEADER '},
        name :  'Persistance HEADER: Should accept the request and retrieve stored header '},
      {method: 'OPTIONS', headers: { 'x-relayer-persistence ' :  'BODY '},
        name :  'Persistance BODY: Should accept the request and retrieve the stored body '},
      {method: 'OPTIONS', headers: { 'x-relayer-httpcallback ' :  'http://noname.com '},
        name :  'Callback: Should accept the request and retrieve the completed task '},
      {method: 'OPTIONS', headers: { 'x-relayer-httpcallback-error ' :  'http://noname.com '},
        name :  'Error Callback: Should accept the request and retrieve the completed task '},
      {method: 'OPTIONS', headers: { 'x-relayer-retry ' :  '10, 20, 30 '},
        name :  'Retry: Should accept the request and retrieve the completed task '},
      {method: 'OPTIONS', headers: {'x-relayer-proxy' : 'proxy.com'},
        name :  'Proxy: Should accept the request and retrieve the completed task '},
      {method: 'OPTIONS', headers: {'x-relayer-encoding' : 'base64'},
        name :  'Encoding: Should accept the request and retrieve the completed task '},
      {method: 'OPTIONS', headers: {'x-relayer-traceid' : 'TEST'},
        name :  'TRACEID: Should accept the request and retrieve the traceid and the completed task '}
      //{method: 'OPTIONS', headers: {'x-relayer-traceid' : 'TEST2'},
      //  name :  'TO DO: CHECK why the last test is not validated... '}
    ];

    for(var i=0; i < dataSetOPTIONS.length; i++){
      _validScenario(dataSetOPTIONS[i]);  //Launch every test in data set
    }
  });
});
