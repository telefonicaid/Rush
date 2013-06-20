var should = require('should');
var superagent = require('superagent');
var config = require('./config');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;
var ENDPOINT = config.externalEndpoint;
var TIMEOUT = 1000;

var ids=[];

describe('Scenario: Basic acceptance tests for Rush as a Service ', function() {
	describe('/ADD http requests ', function() {

		describe('with a valid Endpoint and Headers', function() {
			var agent = superagent.agent();

			it('should accept requests using / POST', function(done) {
				agent
						.post('http://' + HOST + ':' + PORT)
						.set('X-relayer-host', ENDPOINT)
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(res);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					ids.push(res.body['id']);
					res.should.have.status(200);
					res.text.should.include('id');
					return done();
				}
			});

			it('should accept requests using / GET', function(done) {
				agent
						.get('http://' + HOST + ':' + PORT)
						.set('X-relayer-host', ENDPOINT)
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(res);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					ids.push(res.body['id']);
					res.should.have.status(200);
					res.text.should.include('id');
					return done();
				}
			});

			it('should accept requests using / PUT', function(done) {
				agent
						.put('http://' + HOST + ':' + PORT)
						.set('X-relayer-host', ENDPOINT)
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(res);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					ids.push(res.body['id']);
					res.should.have.status(200);
					res.text.should.include('id');
					return done();
				}
			});

			it('should accept requests using / OPTIONS', function(done) {
				agent
						.options('http://' + HOST + ':' + PORT)
						.set('X-relayer-host', ENDPOINT)
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(res);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					ids.push(res.body['id']);
					res.should.have.status(200);
					res.text.should.include('id');
					return done();
				}
			});

			it('should accept requests using / TRACE', function(done) {
				agent
						.trace('http://' + HOST + ':' + PORT)
						.set('X-relayer-host', ENDPOINT)
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(res);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					ids.push(res.body['id']);
					//console.log(res.body['id']);
					res.should.have.status(200);
					res.text.should.include('id');
					return done();
				}
			});

			it('should NOT accept requests using / HEAD', function(done) {
				agent
						.head('http://' + HOST + ':' + PORT)
						.set('X-relayer-host', ENDPOINT)
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(res);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					ids.push(res.body['id']);
					res.should.have.status(200);
					res.text.should.not.include('id');
					return done();
				}
			});

			});

		});
	});

	describe('/Retrieve processed requests', function(){
		describe('with valid Endpoint and parameters', function() {
			var agent = superagent.agent();

			it('should return the completed task using / POST', function(done) {
				agent
						.post('http://' + HOST + ':' + PORT)
						.set('X-relayer-host', ENDPOINT)
						.set('X-relayer-persistence', 'BODY')
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(res);
					ids.push(res.body['id']);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					res.should.have.status(200);
					res.text.should.include('id');
					//console.log(res.body['id']);
					setTimeout(function(){
						agent
								.get('http://' + HOST + ':' + PORT + '/response/' + ids[0])
								.end(
								function onResponse2(err2, res2) {
									//console.log("***CHECK POINT***",res2.body['id'])
									res2.headers['content-type'].should.eql('application/json; charset=utf-8');
									res2.should.have.status(200);
									res2.text.should.include('id');
									res2.body['topic'].should.eql('undefined');

								});
						return done();
					}, TIMEOUT);
				};

			});

			it('should return the completed task using / GET', function(done) {
				agent
						.get('http://' + HOST + ':' + PORT)
						.set('X-relayer-host', ENDPOINT)
						.set('X-relayer-persistence', 'BODY')
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(res);
					ids.push(res.body['id']);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					res.should.have.status(200);
					res.text.should.include('id');
					//console.log(res.body['id']);
					setTimeout(function(){
						agent
								.get('http://' + HOST + ':' + PORT + '/response/' + ids[0])
								.end(
								function onResponse2(err2, res2) {
									//console.log("***CHECK POINT***",res2.body['id'])
									res2.headers['content-type'].should.eql('application/json; charset=utf-8');
									res2.should.have.status(200);
									res2.text.should.include('id');
									res2.body['topic'].should.eql('undefined');

								});
						return done();
					}, TIMEOUT);
				};

			});

			it('should return the completed task using / PUT', function(done) {
				agent
						.put('http://' + HOST + ':' + PORT)
						.set('X-relayer-host', ENDPOINT)
						.set('X-relayer-persistence', 'BODY')
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(res);
					ids.push(res.body['id']);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					res.should.have.status(200);
					res.text.should.include('id');
					//console.log(res.body['id']);
					setTimeout(function(){
						agent
								.get('http://' + HOST + ':' + PORT + '/response/' + ids[0])
								.end(
								function onResponse2(err2, res2) {
									//console.log("***CHECK POINT***",res2.body['id'])
									res2.headers['content-type'].should.eql('application/json; charset=utf-8');
									res2.should.have.status(200);
									res2.text.should.include('id');
									res2.body['topic'].should.eql('undefined');

								});
						return done();
					}, TIMEOUT);
				};

			});

			it('should return the completed task using / OPTIONS', function(done) {
				agent
						.options('http://' + HOST + ':' + PORT)
						.set('X-relayer-host', ENDPOINT)
						.set('X-relayer-persistence', 'BODY')
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(res);
					ids.push(res.body['id']);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					res.should.have.status(200);
					res.text.should.include('id');
					//console.log(res.body['id']);
					setTimeout(function(){
						agent
								.get('http://' + HOST + ':' + PORT + '/response/' + ids[0])
								.end(
								function onResponse2(err2, res2) {
									//console.log("***CHECK POINT***",res2.body['id'])
									res2.headers['content-type'].should.eql('application/json; charset=utf-8');
									res2.should.have.status(200);
									res2.text.should.include('id');
									res2.body['topic'].should.eql('undefined');

								});
						return done();
					}, TIMEOUT);
				};

			});

		});
		describe('without valid parameters', function() {
			var agent = superagent.agent();
			it('should NOT retrieve a task not registered / GET', function(done) {
				agent
						.get('http://' + HOST + ':' + PORT+ '/response/' + '75017550-d8bb-aaaa-a5c8-2581ec642c1f')
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(res);
					res.headers['x-powered-by'].should.eql('Express');
//						res.headers['content-type'].should.eql('text/plain');
					ids.push(res.body['id']);
					res.should.have.status(200);
					res.text.should.not.include('id');
					return done();
				}
			});

			it('should refuse an invalid task request / GET ', function(done) {
				agent
						.get('http://' + HOST + ':' + PORT+ '/' + ids[0])
						.end(onResponse2);
				function onResponse2(err2, res2) {
					//console.log(res);
					//res2.headers['content-type'].should.eql('application/json; charset=utf-8');
					res2.should.have.status('404');
					res2.text.should.not.include('id');
				}
				return done();
			});
		});
	});


