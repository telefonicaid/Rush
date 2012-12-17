var pf = require('performanceFramework');
var qm = require('./redisUtils.js');
var client = require('./client.js');
var server = require('./server.js');

var test_time = 30000;
var monitor_interval = 500;

var scenario1 = pf.describe('Rush benchmark - Blocking server', 'This test makes 500 requests. One every 10ms. This shows how Rush behaves against blocking servers', 'wijmo', ['Time', 'Queued requests'], ['localhost'], './log');//monitor on localhost

var doOne = function (time, cb) {
    scenario1.test('Blocking server ' + time + 'ms', function (log, point) {
        'use strict';
        var area = 0;
        var i = 0;
        var monitorInterval = setInterval(function () {
            qm.monitorQueue('wrL:hpri', function (i, value) {
                point(i, value);
                console.log(value);
                area += value / 400;
            }.bind(null, i));
            i++;
        }, monitor_interval);

        var curr_srv = server.createServer(time, 0, function () {
            var completed = 0;

            function doReq(i) {
                client.client('localhost', 3001, "http://localhost:5001");
                i++;
                if (i < 400) {
                    setTimeout(function () {
                        doReq(i);
                    }, 10);
                }
            }

            doReq(0);
        });
        setTimeout(function () {
            log(area);
            server.closeServer(curr_srv, function(){
                qm.flushBBDD(cb);
            });
            clearInterval(monitorInterval);
        }, test_time);
    });
};

var testsSeries = function (start, end, interval) {
    var doNTimes = function (){
        console.log('empieza');
        doOne(start, function(){
            start+=interval;
            if(start<=end){
                doNTimes();
            }
            else{
                scenario1.done();
                qm.closeConnection();
            }
        });
    };
    doNTimes();
};

testsSeries(1000, 5000, 1000);
