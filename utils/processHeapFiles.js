var async = require("async"),
    fs = require("fs");

function filterFiles(fileList, callback) {
    var logFilter = function (element) {
        return element.match(/heapDiff.*json/);
    };

    callback(null, fileList.filter(logFilter));
}


// BeforeDate AfterDate What Size SizeB
function readFields(fileData, callback) {
    var parsedObj = JSON.parse(fileData),
        csvExcerpt = [],
        csvRow;

    csvRow += ";";

    for (var i= 0; i < parsedObj.change.details.length; i++) {
        csvRow = "";
        csvRow += parsedObj.before.time + "; ";
        csvRow += parsedObj.after.time + "; ";
        csvRow += parsedObj.change.details[i].what + "; ";
        csvRow += parsedObj.change.details[i].size + "; ";
        csvRow += parsedObj.change.details[i].size_bytes + "; ";

        csvExcerpt.push(csvRow);
    }

    callback(null, csvExcerpt.join("\n"));
}

function processSingleFile(path, file, callback) {
    async.waterfall([
        async.apply(fs.readFile, path + "/" + file, "utf8"),
        readFields
    ], callback);
}

function processFiles(path, fileArray, callback) {
    async.map(fileArray, async.apply(processSingleFile, path), callback);
}

function serializeResults(results, callback) {
    var finalResults = results.join("\n");

    callback(null, finalResults);
}

function processHeapFiles(path, fileName, callback) {
    async.waterfall([
        async.apply(fs.readdir, path),
        filterFiles,
        async.apply(processFiles, path),
        serializeResults,
        async.apply(fs.writeFile, fileName)
    ], callback)
}

processHeapFiles(process.argv[2], process.argv[3], function (error) {
    if (error) {
        console.log("There was an error processing files: " + error);
    } else {
        process.exit(0);
    }
})