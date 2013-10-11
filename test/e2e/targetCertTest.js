var should = require('should');
var superagent = require('superagent');
var config = require('./config');
var chai = require('chai');
var expect = chai.expect;
var _ = require('underscore');
var async = require('async');
var server = require('./advancedServer.js');
//var server = require('./simpleServer.js');

var consumer = require('../../lib/consumer.js');
var listener = require('../../lib/listener.js');

//RUSH ENDPOINT
var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;
var RUSHENDPOINT = 'http://' + HOST + ':' + PORT;

//Final host endpoint
var fhHOST = config.simpleServerHostname;
var fhPORT = config.simpleServerPort; //8014;
var ENDPOINT = config.externalEndpoint;
if (!ENDPOINT) {
  ENDPOINT = fhHOST + ':' + fhPORT;
}

// Verbose MODE
var vm = false;
//var vm = false;

// Time to wait to check the status of the task
var TIMEOUT = 600;
var CREATED = 201;
var describeTimeout = 5000;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = true; //Do not Accept self signed certs

var serversToShutDown = [];
var certB64 = 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tDQpNSUlDS1RDQ0FaSUNDUUQ1TUV2QUNNdU0wREFOQmdrcWhraUc5dzBCQVFVRkFE' +
    'QlpNUXN3Q1FZRFZRUUdFd0pCDQpWVEVUTUJFR0ExVUVDQXdLVTI5dFpTMVRkR0YwWlRFaE1COEdBMVVFQ2d3WVNXNTBaWEp1WlhRZ1YybGtaMm' +
    'wwDQpjeUJRZEhrZ1RIUmtNUkl3RUFZRFZRUUREQWxzYjJOaGJHaHZjM1F3SGhjTk1UTXdPREl3TVRFd056UXpXaGNODQpNVFF3T0RJd01URXdO' +
    'elF6V2pCWk1Rc3dDUVlEVlFRR0V3SkJWVEVUTUJFR0ExVUVDQXdLVTI5dFpTMVRkR0YwDQpaVEVoTUI4R0ExVUVDZ3dZU1c1MFpYSnVaWFFnVj' +
    'Jsa1oybDBjeUJRZEhrZ1RIUmtNUkl3RUFZRFZRUUREQWxzDQpiMk5oYkdodmMzUXdnWjh3RFFZSktvWklodmNOQVFFQkJRQURnWTBBTUlHSkFv' +
    'R0JBTTQwR0VhVEQvQkRxZm12DQpPRUdaYW9SZTJheWM2OVFJU1hWQnRmTVNwaXoxZ01DZ2ttUXdiaVo4L2U2WDZJaWxtZGhwbkp6YTVFL0drM2' +
    'xqDQpmbWFHZnhHY0tsUHJlMXNJSTNTMEwyRzhUakgyZ2NNY0xtcnJpQTh5Rng5clNrRHVnaEJJNkJoMkVMczdUQ1NIDQphWUFoRFZDTTREUkZ0' +
    'dFMvMXBMSmxrQk9ueGVqQWdNQkFBRXdEUVlKS29aSWh2Y05BUUVGQlFBRGdZRUFrcWVHDQpxYncrVjFDSzM2M2s3c0ZhUlgzUEpsZ2VnOU5iSU' +
    'UxMEhKc21UcUI4anVxaWk5MVBRRkRFWnRjOWp2VHRMVVNzDQpqR3Zyd0hTQlNiR2ZTNnRNdjJQdHNnRzg4ZW9zRFRLbzBkM2padkFEVVlVZ2Qy' +
    'T0FaaWY0YkJLdjFMOGtVVE9NDQpYN1FxUFFCZmUyZG84WEdOQ3V6RlpGa2RseFd1VW9OV3pjbXkwaEU9DQotLS0tLUVORCBDRVJUSUZJQ0FURS' +
    '0tLS0t';

function _validScenario(data) {
  'use strict';
  it('Case ' + data.name + ' #FTC', function(done) {
    var agent = superagent.agent();
    var id;

    var method;
    switch (data.method) {
    case 'DELETE':
      method = 'del';
      break;
    default:
      method = data.method.toLowerCase();
    }

    var simpleServer = server({port: fhPORT, protocol: data.protocol}, {statusCode: '201'},
        function() {

          var req = agent;
              [method](RUSHENDPOINT + data.path)
            //	.set('x-relayer-host', ENDPOINT)  //Always the same endpoint
              .set('x-relayer-host', 'localhost:8014')  //Hardcoded
              .set('x-relayer-persistence', 'BODY')
              .set('content-type', 'application/json')
              .set(data.headers);

          if (data.method === 'POST' || data.method === 'PUT') {
            req = req.send(data.body);
          }

          req.end(function(err, res) {
            if (vm) {console.log(res.body);}
            expect(err).to.not.exist;
            expect(res.statusCode).to.eql(CREATED);
            expect(res.body).to.exist;
            expect(res.body.id).to.exist;
            id = res.body.id;
            res.text.should.not.include('exception');
            //	done();
          });
        },

        function(dataReceived) {
          expect(dataReceived).to.exist;
          if (vm) {console.log('\n SERVER PATH: ' + dataReceived.url);}
          dataReceived.method.should.be.equal(data.method);
          dataReceived.url.should.be.equal(data.path);

          var checked = false;
          setTimeout(function() {
            agent
                .get(RUSHENDPOINT + '/response/' + id)
                .end(function onResponse2(err2, res2) {
                  if (vm) {
                    console.log(res2);
                    //console.log(res2.body);
                  }
                  expect(err2).to.not.exist;
                  expect(res2).to.exist;
                  expect(res2.statusCode).to.equal(200);
                  expect(res2.body).to.exist;
                  expect(res2.body['body']).to.equal('Request Accepted');
                  res2.headers['content-type'].should.eql('application/json; charset=utf-8');
                  res2.text.should.include('id');
                  res2.text.should.include('state');
                  res2.text.should.not.include('exception');

                  done();
                });
          }, TIMEOUT);
        });
    serversToShutDown.push(simpleServer);
  });
}


function _invalidScenario(data) {
  'use strict';
  it('Case ' + data.name + ' #FTC', function(done) {
    var agent = superagent.agent();
    var id;

    var method;
    switch (data.method) {
    case 'DELETE':
      method = 'del';
      break;
    default:
      method = data.method.toLowerCase();
    }

    var simpleServer = server({port: fhPORT, protocol: data.protocol}, {statusCode: '501'},
        function() {

          var req = agent;
              [method](RUSHENDPOINT + data.path)
            //	.set('x-relayer-host', ENDPOINT)  //Always the same endpoint
              .set('x-relayer-host', 'localhost:8014')  //Hardcoded
              .set('x-relayer-persistence', 'BODY')
              .set('content-type', 'application/json')
              .set(data.headers);
          if (data.method === 'POST' || data.method === 'PUT') {
            req = req.send(data.body);
          }
          req.end(function(err, res) {
            if (vm) {console.log(res.body);}
            expect(err).to.not.exist;
            expect(res.statusCode).to.eql(CREATED);
            expect(res.body).to.exist;
            expect(res.body.id).to.exist;
            id = res.body.id;
            res.text.should.not.include('exception');
            //	done();
            setTimeout(function() {
              agent
                  .get(RUSHENDPOINT + '/response/' + id)
                  .end(function onResponse2(err2, res2) {
                    if (vm) {
                      //	console.log(res2);
                      console.log(res2.body);
                    }
                    expect(err2).to.not.exist;
                    expect(res2).to.exist;
                    expect(res2.body).to.exist;
                    res2.headers['content-type'].should.eql('application/json; charset=utf-8');
                    expect(res2.body.id).to.exist;
                    expect(res2.body.exception).to.exist;
                    expect(res2.body.exception['exceptionId']).to.equal('SVC Relayed Host Error');
                    if (vm) {console.log(res2.body.exception.exceptionText);}
                    expect(res2.body.exception['exceptionText']).to.equal('DEPTH_ZERO_SELF_SIGNED_CERT');
                    done();
                  });
            }, TIMEOUT);
          });
        });
    serversToShutDown.push(simpleServer);
  });
}


describe('Feature: Target Certificate ' + '#FTC', function() {
  'use strict';
  this.timeout(6000);

  before(function(done) {
    listener.start(function() {
      consumer.start(done);
    });
  });

  after(function(done) {
    listener.stop(function() {
      consumer.stop(done);
    });
  });

  afterEach(function() {
    for (var i = 0; i < serversToShutDown.length; i++) {
      try {
        serversToShutDown[i].close();
      } catch (e) {}
    }
    serversToShutDown = [];
  });




  describe('Retrieve request with a valid header policy request using HTTPS ', function() {

    var dataSetPOST = [
      {protocol: 'https', method: 'GET', path: '/',
        headers: {'X-Relayer-Protocol': 'https', 'x-relayer-server-cert': certB64}, body: {},
        name: '1 Should accept the request using the target Certificate of the HTTPS server /GET'},
      {protocol: 'https', method: 'POST', path: '/',
        headers: {'X-Relayer-Protocol': 'https', 'x-relayer-server-cert': certB64}, body: {},
        name: '2 Should accept the request using the target Certificate of the HTTPS server /POST'},
      {protocol: 'https', method: 'PUT', path: '/',
        headers: {'X-Relayer-Protocol': 'https', 'x-relayer-server-cert': certB64}, body: {},
        name: '3 Should accept the request using the target Certificate of the HTTPS server /PUT'},
      {protocol: 'https', method: 'DELETE', path: '/',
        headers: {'X-Relayer-Protocol': 'https', 'x-relayer-server-cert': certB64}, body: {},
        name: '4 Should accept the request using the target Certificate of the HTTPS server /DELETE'},
      {protocol: 'https', method: 'GET', path: '/withpath',
        headers: {'X-Relayer-Protocol': 'https', 'x-relayer-server-cert': certB64}, body: {},
        name: '5 Should accept the request using the target Certificate of the HTTPS server adding a path /GET'},
      {protocol: 'https', method: 'POST', path: '/withpath',
        headers: {'X-Relayer-Protocol': 'https', 'x-relayer-server-cert': certB64}, body: {},
        name: '6 Should accept the request using the target Certificate of the HTTPS server adding a path /POST'}
    ];

    for (var i = 0; i < dataSetPOST.length; i++) {
      _validScenario(dataSetPOST[i]);  //Launch every test in data set
    }

    var dataSetInvalid = [
      {protocol: 'https', method: 'GET', path: '/',
        headers: {'X-Relayer-Protocol': 'https', 'x-relayer-server-cert': 'fakecert'}, body: {},
        name: '1 Should reject the request using a fake Certificate of the HTTPS server /GET'},
      {protocol: 'https', method: 'POST', path: '/',
        headers: {'X-Relayer-Protocol': 'https', 'x-relayer-server-cert': 'fakecert'}, body: {},
        name: '2 Should reject the request using a fake Certificate of the HTTPS server /POST'},
      {protocol: 'https', method: 'PUT', path: '/',
        headers: {'X-Relayer-Protocol': 'https', 'x-relayer-server-cert': 'fakecert'}, body: {},
        name: '3 Should reject the request using a fake Certificate of the HTTPS server /PUT'},
      {protocol: 'https', method: 'DELETE', path: '/',
        headers: {'X-Relayer-Protocol': 'https', 'x-relayer-server-cert': 'fakecert'}, body: {},
        name: '4 Should reject the request using a fake Certificate of the HTTPS server /DELETE'},
      {protocol: 'https', method: 'GET', path: '/withpath',
        headers: {'X-Relayer-Protocol': 'https', 'x-relayer-server-cert': 'fakecert'}, body: {},
        name: '5 Should reject the request using a fake Certificate of the HTTPS server adding path /GET'},
      {protocol: 'https', method: 'POST', path: '/withpath',
        headers: {'X-Relayer-Protocol': 'https', 'x-relayer-server-cert': 'fakecert'}, body: {},
        name: '6 Should reject the request using a fake Certificate of the HTTPS server adding path /POST'}
    ];

    if (/v0\.10.*/.test(process.version)) {
      for (i = 0; i < dataSetInvalid.length; i++) {
        _invalidScenario(dataSetInvalid[i]);  //Launch every test in data set
      }
    }


  });


});
