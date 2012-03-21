var G = require('./my_globals').C;

var mongodb = require('mongodb');

var clients = [];

function init(emitter, callback) {


    var client = new mongodb.Db('foobar', new mongodb.Server("localhost", 27017, {}));
    client.open(function (err, p_client) {
        client.collection('nodetest', function (err, c) {
            if (err) {
                callback && callback(err);
            }
            else {
                var collection = c;
                emitter.on(G.EVENT_NEWSTATE, function new_event(data) {
                    console.log("lNEW STATE ARRIVED");
                    console.dir(data);
                    collection.insert(data, function (err, docs) {
                        if (err) console.log(err);
                        else console.log(docs);
                    });
                });
                emitter.on(G.EVENT_ERR, function new_error(data) {
                    console.log("lNEW ERROR ARRIVED");
                    console.dir(data);
                    collection.insert(data, function (err, docs) {
                        if (err) console.log(err);
                        else console.log(docs);
                    });
                });
                callback && callback(null);
            }
        });
    });
    clients.push(client);
}

exports.init = init;
