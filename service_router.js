var worker_relay = require("./worker_relay");
var MG = require("./my_globals").C;
/*
 ok: true/false
 service
 message
 */
function route(request) {

    if (!request.headers[MG.HEAD_RELAYER_HOST]) {
        return { ok:false, message:MG.HEAD_RELAYER_HOST + " is missing"};
    }
    else {
        return { ok:true, service:"wrL:hpri"};
    }

}


function getQueues() {
    return {control:"wrL:control",
        hpri:"wrL:hpri",
        lpri:"wrL:lpri" };
}

function getWorker(resp) {
    // Select a worker based on resp data ( from task queue)
    return worker_relay.do_job;
}

exports.route = route;
exports.getWorker = getWorker;
exports.getQueues = getQueues;

