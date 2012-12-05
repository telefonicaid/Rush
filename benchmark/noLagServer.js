var pf = require('performanceFramework');
var qm = require('./queueMonitor.js');
var client = require('./client.js');
var server = require('./server.js');

var scenario1 = pf.describe('Second scenario', 'In this scenario we will test Rush behaviour with a server wit no lag'
    , 'wijmo', ['Xaxis', 'Yaxis'], [], './log'); //monitor on localhost
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

    var server1 = server.createServer(0, 1000, function () {
        var completed = 0;
        function doReq(i){
            client.client('localhost', 3001, "http://localhost:5001");
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
