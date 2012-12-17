var pf = require('performanceFramework');
var redisUtils = require('./redisUtils.js');
var client = require('./client.js');
var server = require('./server.js');

var scenario2 = pf.describe(
    'Rush benchmark - Server without lags',  //Name
    'In this scenario we will test Rush behaviour with a server wit no lag',    //Description
    'wijmo',                                //Template
    ['Time','Queued requests'],             //Axis
    ['localhost'],                          //No monitors
    './log');                               //The generated HTML file will be save in the 'log' folder.

scenario2.test('Payload of 10 MB', function (log, point) {
    'use strict';
    var i = 0;

    var monitorInterval = setInterval(function () {
        redisUtils.monitorQueue('wrL:hpri', function (i, value) {
            point(i, value);
            console.log(value);
        }.bind(null, i));
        i++;
    }, 1000);

    var server1 = server.createServer(0, 1000000, function () {

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
        scenario2.done();
        redisUtils.closeConnection();
        server.closeServer(server1);
    }

    setTimeout(freeAll, 120000);
});
