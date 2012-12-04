var pf = require('performanceFramework');
var qm = require('./queueMonitor.js');
var client = require('./client.js');
var server = require('./server.js');



var scenario1 = pf.describe('dsf', 'This is an example...', 'wijmo', ['Xaxis', 'Yaxis'], [], './log'); //monitor on localhost
scenario1.test('test1', function (log, point) {
    'use strict';
    var i = 0;
    var monitorInterval = setInterval(function () {
        qm.monitorQueue('wrL:hpri', function (i, value) {
            point(i, value);
            console.log(value);
        }.bind(null, i));
        i++;
    }, 1000);

    var server1 =server.createServer(5000, 1000, function () {
        var completed = 0;
        function doReq(i){
            client.client('localhost', 3001, "http://localhost:8091");
            i++;
            if(i < 300){
                setTimeout(function(){
                doReq(i);
                },10);
            }

        }
        doReq(0);
    });

    function freeAll(){
        clearInterval(monitorInterval);
        scenario1.done();
        server.closeServer(server1);
    }

    setTimeout(freeAll, 60000);

});
