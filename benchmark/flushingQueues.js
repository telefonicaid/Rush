var pf = require('performanceFramework');
var qm = require('./queueMonitor.js');
var client = require('./client.js');
var server = require('./server.js');
var childProcess = require('child_process');

var scenario4 = pf.describe('dsf', 'This is an example...', 'wijmo', ['Xaxis', 'Yaxis'], [], './log'); //monitor on localhost

scenario4.test('test1', function (log, point) {
    'use strict';
    var count=0;
    var server1 = server.createServer(0, 100000, function () {
        for (var i =0;i < 1000;i++) {
            client.client('localhost', 3001, "http://localhost:8091",function(){
                    count++;
                    if (count===1000){
                          initConsumer(server1,log,point);
                    }
            });
        }
        });
});

 function initConsumer(server1,log,point){
     'use strict';
     var time=new Date().valueOf();
     point(0,1000);

     var child = childProcess.exec('node ../src/consumer.js');



     var monitorInterval = setInterval(function () {
         qm.monitorQueue('wrL:hpri', function (value) {
             point((new Date().valueOf() - time)/1000,value);
             if (value===0){
                 scenario4.done();
                server.closeServer(server1);
                clearInterval(monitorInterval);
             }
         });
     }, 1000);
 }



