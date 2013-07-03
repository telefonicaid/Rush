var config = require('./configBase.js');
var redis = require('redis');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var childProcess = require('child_process');
var _ = require('underscore');

var log = require('PDITCLogger');
var logger = log.newLogger();

Sentinel = function(port, host){
  var self = this;
  self.port = port;
  self.host = host;

  self.sentinelCli = redis.createClient(port, host);

  self.up = false;

  self.sentinelCli.on('error', function(err){
    self.up = false;
    console.log(err);
    self.emit('wentDown');
  });

  self.sentinelCli.on('ready', function(){
    self.up = true;
    persistenceMasterMonitor(self, function(newMaster){
      self.emit('changed', newMaster);
    });
    self.emit('sentinelReady');
  });
};


util.inherits(Sentinel, EventEmitter);

Sentinel.prototype.getMasters = function(callback){
  var self = this;

  var cli = redis.createClient(self.port, self.host);
  cli.send_command("SENTINEL", ["masters"], function(err, res){
    var masters = {};
    for(var i=0; i < res.length; i++){
      var keys = _.filter(res[i], function(num, key){ return key % 2 === 0; });
      var values = _.filter(res[i], function(num, key){ return key % 2 !== 0; });
      var toObject = _.object(keys, values);
      toObject = _.pick(toObject, "ip", "port", "name");
      masters[toObject.name] = toObject;
    }
    callback(err, masters);
    cli.quit();
  });
};

Sentinel.prototype.getSentinels = function(newSentinel){
  var self = this;

  self.sentinelCli.subscribe('+sentinel');

  self.sentinelCli.on('message', function(channel, message){
    if(channel === '+sentinel'){
      var splitted = message.split(' ');
      console.log(message);
      var index = splitted[0], host = splitted[3], port = splitted[4];
    }
  });
};

function persistenceMasterMonitor(sentinel, onChanged){
  'use strict';

  sentinel.sentinelCli.subscribe('+switch-master');
  sentinel.sentinelCli.on('message', function(channel, message){
    if(channel === '+switch-master'){
      var splitted = message.split(' ');
      var index = splitted[0], host = splitted[3], port = splitted[4];
      onChanged({master : index, host : host, port : port});
    }
  });
};

module.exports = Sentinel;
