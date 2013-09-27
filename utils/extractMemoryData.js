var fs = require("fs"),
    async = require("async"),
    redis = require("redis");

function getRedisConnection(host, port, database) {
    cli = redis.createClient(port, host);

    cli.select(database);

    cli.on('error', function(err){
        console.log("Couldn't recover from redis error");
        process.exit(1);
    });

    return cli;
}

function getRedisData(callback) {
    var connection = getRedisConnection(process.argv[2], 6379, 0);

    connection.lrange("Monitoring", 0, -1, callback);
}

function processSingleItem(item, callback) {
    var objItem = JSON.parse(item),
        itemString = "";

    itemString += '"' + objItem.currentDate + '"; ';
    itemString += objItem.queueLength + "; ";
    itemString += objItem.memory.num_full_gc + "; ";
    itemString += objItem.memory.num_inc_gc + "; ";
    itemString += objItem.memory.heap_compactions + "; ";
    itemString += objItem.memory.usage_trend + "; ";
    itemString += objItem.memory.estimated_base + "; ";
    itemString += objItem.memory.current_base + "; ";
    itemString += objItem.memory.min + "; ";
    itemString += objItem.memory.max + "; ";
    itemString += objItem.name + "; ";
    itemString += (objItem.lastLeak)?"True":"False" + ";";

    callback(null, itemString);
}

function processData(data, callback) {
    async.map(data, processSingleItem, callback);
}

function serializeData(data, callback) {

    var header = "Date; QueueLength; N Full Gc; N Inc GC; Compactions; Trend; Est. Base; Curr. Base; Min; Max; Name; Leak;"

    data.push(header);
    data.reverse();

    callback(null, data.join("\n"));
}

function extractData(callback) {
    async.waterfall([
        getRedisData,
        processData,
        serializeData,
        async.apply(fs.writeFile, "results.csv")
    ], callback);
}

extractData(function (error) {
    if (error) {
        console.log("There was an error processing the array: " + error);
    }

    process.exit(0);
})