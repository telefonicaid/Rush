//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//


var mongodb = require('mongodb');

var G = require('./my_globals').C;
var config = require('./config_base').ev_lsnr;


var clients = [];

function init(emitter, callback) {
  "use strict";

  var client = new mongodb.Db(config.mongo_db,
    new mongodb.Server(config.mongo_host, config.mongo_port, {}));

  client.open(function(err, p_client) {
    if (err) {
      if (callback) {
        callback(err);
      }
    } else {
      client.collection(config.collectionState, function(err, c) {
        if (err) {
          if (callback) {
            callback(err);
          }
        } else {
          var collection = c;
          emitter.on(G.EVENT_NEWSTATE, function new_event(data) {
            try {
              console.log("lNEW STATE ARRIVED");
              console.dir(data);
              collection.insert(data, function(err, docs) {
                if (err) {
                  console.log(err);
                } else {
                  console.log(docs);
                }
              });
            } catch (e) {
              console.log(e);
            }
          });
          if (callback) {
            callback(null);
          }
        }
      });

      client.collection(config.collectionError, function(err, c) {
        try {
          if (err) {
            if (callback) {
              callback(err);
            }
          } else {
            var collection = c;
            emitter.on(G.EVENT_ERR, function new_error(data) {
              console.log("lNEW ERROR ARRIVED");
              console.dir(data);

              collection.insert(data, function(err, docs) {
                if (err) {
                  console.log(err);
                } else {
                  console.log(docs);
                }
              });

            });
            if (callback) {
              callback(null);
            }
          }
        } catch (e) {
          console.log(e);
        }
      });
      clients.push(client);
    }
  });
}

exports.init = init;
