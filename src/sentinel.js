var config = require('./configBase.js');
var redis = require('redis');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var childProcess = require('child_process');

var log = require('PDITCLogger');
var logger = log.newLogger();

Sentinel = function(port, host){
  var self = this;
  self.up = true;

  console.log("new sentinel", port);

  sentinelCli = redis.createClient(port, 'localhost');

  sentinelCli.on('error', function(err){
    self.up = false;
    self.emit('wentDown');
  });

  sentinelCli.on('ready', function(){
    self.emit('ready');
    persistenceMasterMonitor(self, sentinelCli);
  });
};

var persistenceMasterMonitor = function(sentinel, cli){
  'use strict';

  cli.subscribe('+switch-master');
  cli.on('message', function(channel, message){
    var splitted = message.split(' ');
    var index = splitted[0], host = splitted[3], port = splitted[4];
    sentinel.emit('changed', {index : parseInt(index), host : host, port : port});
  });
};

util.inherits(Sentinel, EventEmitter);
module.exports = Sentinel;
