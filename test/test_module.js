//Testing Module For Rush
var LISTENER_HOSTNAME = 'localhost', LISTENER_PORT = '8030', REDIS_HOST = 'Relay1';


var http = require('http');
var global = require('../my_globals').C;
var async = require('async');
var os = require('os');
var redis_mod = require('redis');
var redis = redis_mod.createClient(redis_mod.DEFAULT_PORT, REDIS_HOST);
var server, end_point_req, end_point_res, client_res, client_req, relayer_header = {}, options;
var oneway = function(method) {
  return function(callback) {
    console.log('\nONEWAY TEST FOR METHOD ' + method);
    //Create EndPoint server
    server = http.createServer(
      function(req, res) {
        exports.end_point_req = req;
        //verify Server Side
        console.log('Verify Server Side');
        //TEST PATH
        if (req.url == '/testpath') {
          ok(' request URL: ' + req.url);
        } else {
          fail(' request URL:' + req.url);
        }
        //TEST METHOD
        if (req.method == method) {
          ok(' request METHOD:' + req.method);
        } else {
          fail(' request METHOD:' + req.method);
        }
        //TEST POST-PUT-DATA
        if (req.method == 'POST' || req.method == 'PUT') {
          var post_data = '';
          req.on('data', function(chunk) {
            chunk ? post_data += chunk : '';
          });
          req.on('end', function(chunk) {
            chunk ? post_data += chunk : '';
            //verify POST DATA
            if (post_data == "POST/PUT TEST DATA") {
              ok(' POST/PUT DATA received OK')
            } else {
              fail(' WRONG POST/PUT DATA: ' + post_data);
            }
            //END OF THE SERVER FLOW for PUT y POST
            callback && callback();
          })
        }
        //test
        //TEST HEADERS
        if (req.headers['testheader'] == 'FOO_TEST_VAL') {
          ok('OK HEADER FOUND: ' + req.headers['testheader']);
        } else {
          fail('FAIL HEADER: ' + req.headers['testheader']);
        }
        res.writeHead(200);
        res.write('TEST-oneway');
        res.end();
        exports.end_point_res = res;
        //Destroy Server
        server.close();
        if (req.method == 'GET' || req.method == 'DELETE') {
          callback && callback();
        }
      }).listen(8765);
    //Launch a oneway request
    relayer_header[global.HEAD_RELAYER_HOST] =
      'http://' + os.hostname() + ':8765/testpath';
    relayer_header['testheader'] = 'FOO_TEST_VAL';
    options = {
      hostname: LISTENER_HOSTNAME,
      port: LISTENER_PORT,
      method: method,
      headers: relayer_header
    };
    client_req = http.request(options, client_request_test_handler);
    if (method == 'POST' || method == 'PUT') {
      //Send post data
      client_req.write("POST/PUT TEST DATA");
    }
    client_req.end();
    exports.client_req = client_req;
  }
};

var async_get = function(callback) {
  var expected_callback, relayer_header = {};
  console.log('ASYNC-CALLBACK TESTING');
  //Create end point server
  var end_point_server = http.createServer(
    function(req, res) {
      ok(' end point server reached');
      exports.end_point_req = req;
      res.writeHead(200);
      res.write('CALLBACK DATA');
      res.end();
      exports.end_point_res = res;
      end_point_server.close();
    }).listen(8765);
  //Create Callback Server
  var callback_server = http.createServer(
    function(req, res) {
      var post_data = '', expected_callback, expected_callback_JSON;
      ok(' callback arrives');
      //TEST it is going to receive a POST with 'CALLBACK DATA'
      if (req.method == 'POST') {
        req.on('data', function(chunk) {
          chunk ? post_data += chunk : '';
        });
        req.on('end', function(chunk) {
          chunk ? post_data += chunk : '';
          //TEST the callback contents
          exports.callback_data = post_data; //remove

          expected_callback = {
            "resultOk": true,
            "statusCode": 200,
            "headers": {
              "connection": "keep-alive",
              "transfer-encoding": "chunked"
            },
            "body": "CALLBACK DATA"
          };
          expected_callback_JSON = JSON.stringify(expected_callback);
          if (post_data == expected_callback_JSON) {
            ok(' expected data at callback');
          } else {
            fail(' NOT expected data at callback');
            console.log(post_data);
            console.log(expected_callback_JSON);
          }
          //Exitpoint
          callback_server.close();
          console.log('END ASYNC-CALLBACK TESTING');
          callback && callback();
        });
      } else {
        fail(' POST HTTP CALLBACK EXPECTED:' + req.method);
      }
      res.writeHead(200);
      res.end();
    }).listen(8764);
  //Do request
  relayer_header[global.HEAD_RELAYER_HOST] =
    'http://' + os.hostname() + ':8765';
  relayer_header[global.HEAD_RELAYER_HTTPCALLBACK] =
    'http://' + os.hostname() + ':8764';
  options = {
    hostname: LISTENER_HOSTNAME,
    port: LISTENER_PORT,
    method: 'GET',
    headers: relayer_header
  };
  client_req = http.request(options, client_request_test_handler);
  client_req.end();
  exports.client_req = client_req;
};
//type 'STATUS'|'HEADER'|'BODY'
var persistence_get = function(type) {
  return function(callback) {
    var relayer_header = {};
    console.log('PERSISTENCE TESTING');
    //Create end point server
    var end_point_server = http.createServer(
      function(req, res) {
        ok(' end point server reached');
        exports.end_point_req = req;
        res.writeHead(200);
        res.write('PERSISTENT DATA');
        res.end();
        exports.end_point_res = res;
        end_point_server.close();
      }).listen(8765);
    //Do request
    relayer_header[global.HEAD_RELAYER_HOST] =
      'http://' + os.hostname() + ':8765';
    relayer_header[global.HEAD_RELAYER_PERSISTENCE] = type;
    options = {
      hostname: LISTENER_HOSTNAME,
      port: LISTENER_PORT,
      method: 'GET',
      headers: relayer_header
    };
    client_req = http.request(options, function(res) {
      var id = '', expected_data;
      console.log("Rush response (with id)");
      exports.client_res = res;
      res.on('data', function(chunk) {
        chunk ? id += chunk : '';
      });
      res.on('end', function(chunk) {
        chunk ? id += chunk : '';
        //Wait some seconds and look at REDIS
        setTimeout(function() {
          redis.hgetall('wrH:' + id, function(err, data) {
            if (err) {
              console.log('REDIS ERR:' + err);
            } else {
              if (type == 'BODY') {
                expected_data = {
                  resultOk: 'true',
                  statusCode: '200',
                  headers: '{"connection":"keep-alive","transfer-encoding":"chunked"}',
                  body: 'PERSISTENT DATA' };
              } else {
                if (type == 'HEADER') {
                  expected_data = {
                    resultOk: 'true',
                    statusCode: '200',
                    headers: '{"connection":"keep-alive","transfer-encoding":"chunked"}'
                  };
                } else {
                  if (type == 'STATUS') {
                    expected_data = {
                      resultOk: 'true',
                      statusCode: '200'};
                  }
                }
              }
              if (type == 'BODY' || type == 'HEADER' || type == 'STATUS') {
                expected_data = JSON.stringify(expected_data);
                var current_data = JSON.stringify(data);
                if (current_data == expected_data) {
                  ok(' FOUND EXPECTED DATA for ' + type);
                } else {
                  fail(' NOT FOUND EXPECTED DATA for ' + type);
                  console.log('found');
                  console.log(current_data);
                  console.log('expected');
                  console.log(expected_data);
                }
              }
              exports.persistent_data = data;
            }
            callback && callback();
          });
        }, 2000);
      });
    });
    client_req.end();
    exports.client_req = client_req;
  }
};

var retry = function(times, retry_value) {
  return function(callback) {
    //Create end-point Server
    var iter = 1;
    console.log('START RETRY TEST');
    var end_point_server = http.createServer(
      function(req, res) {
        //Server will fail several times and then success
        if (iter == times) {
          //Server res 200 OK
          res.writeHead(200);
          res.write('finally work');
          res.end();
          ok(' Test Success Retried times:' + times);
          iter++;
          //defer server close (catch more retries fail case)
          setTimeout(function() {
            end_point_server.close();
            console.log('END RETRY TEST');
            callback && callback();
          }, 1000);
        } else {
          if (iter < times) {
            //Server res
            res.writeHead(503);
            res.end();
            if (iter < times) {
              ok(' Attempt to send request ' + iter);
            }
            iter++;
            if (retry_value.length <= iter) {
              end_point_server.close();
            }

          } else {
            //more retries than expected
            fail(' Attempt to send request after success' + iter);
            iter++;
          }
        }
      }).listen(8765);
    //send the request
    relayer_header[global.HEAD_RELAYER_HOST] =
      'http://' + os.hostname() + ':8765';
    relayer_header[global.HEAD_RELAYER_RETRY] = retry_value;
    relayer_header[global.HEAD_RELAYER_PERSISTENCE] = 'BODY';
    options = {
      hostname: LISTENER_HOSTNAME,
      port: LISTENER_PORT,
      method: 'GET',
      headers: relayer_header
    };
    client_req = http.request(options, client_request_test_handler);
    client_req.end();
    exports.client_req = client_req;
  }
};

exports.oneway_get = oneway('GET');
exports.oneway_post = oneway('POST');
exports.oneway_put = oneway('PUT');
exports.oneway_delete = oneway('DELETE');
exports.oneway = function(callback) {
  async.series([
    exports.oneway_get, exports.oneway_post, exports.oneway_put,
    exports.oneway_delete], function() {
      console.log('End ONEWAY TEST');
      callback && callback();
    });
}

exports.async_callback = async_get;

exports.persistence_body = persistence_get('BODY');
exports.persistence_header = persistence_get('HEADER');
exports.persistence_status = persistence_get('STATUS');
exports.persistence = function(callback) {
  async.series([
    exports.persistence_body, exports.persistence_header,
    exports.persistence_status], function() {
      console.log('End PERSISTENCE TEST');
      callback && callback();

    });
}
exports.retry = retry(3, '2,10,100,200');
exports.retry_fail = retry(4, '2,10');

exports.all = function() {
  async.series(
    [exports.oneway, exports.async_callback, exports.persistence, exports.retry
    ], function() {
      console.log('Whole tests ended')
    });

}
//AUX
var client_request_test_handler = function(res) {
  var id = '';
  exports.client_res = res;
  res.on('data', function(chunk) {
    chunk ? id += chunk : '';
  });
  res.on('end', function(chunk) {
    chunk ? id += chunk : '';
    //Verify TEST
    console.log('Verify Client Side');
    //We got a 200 + id?
    if (res.statusCode == 200) {
      ok(' 200 OK received');
    } else {
      fail('' + res.statusCode + ' received');
    }
    if (id != '' && id) {
      ok(' ID: ' + id + ' received');
    } else {
      fail('no id received');
    }
    return id;
  });
}

var fail = function(str) {
  var red, blue, reset;
  red = '\033[31m';
  blue = '\033[34m';
  reset = '\033[0m';
  //console.log(red + 'This is red' + reset + ' while ' + blue + ' this is blue' + reset);
  console.log(red + '(FAIL) ' + str + reset);
};

var ok = function(str) {
  var red, blue, reset;
  red = '\033[31m';
  blue = '\033[34m';
  reset = '\033[0m';
  //console.log(red + 'This is red' + reset + ' while ' + blue + ' this is blue' + reset);
  console.log(blue + '(OK) ' + str + reset);
}