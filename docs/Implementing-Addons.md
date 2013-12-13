Rush gives you the option of implementing your own addons to increase its funcionality. This feature is allowed since the system emits multiple events. Events are intended to be a communication mechanism with Addons, typically an historic DB (but any kind of system could be subscribed and react to those events: Queues, External APIS...). To do so an _ad-hoc_ Event Handler must be provided (a .js file with the necessary logic) to be executed on events arrival.

### Subscribing to an event
The first step to implement your addons is to subscribe to a channel that emits events. In Rush there are two channels:
* State of Request Channel: If you subscribe to this channel you will receive an event when a request changes its state (E.g: the request is completed).
* Request Error Channel: If you subscribe to this channel you will receive an event if an error has ocurred.
You can be subscribed to one channel or both.

### Returned data
The data received if you subscribed to a channel is an object with the following shared fields:
* id: The id of the request.
* traceID: The trace ID header of the request (`X-Relayer-traceID`).
* date: The date when the event has been emitted.

If you are subscribed to the error channel there is an error field in which the error that has ocurred is returned.

On the other hand, if you are subscribed to the state channel these fields will be returned in addition to the shared ones:
* state: The state of the request (completed, pending, error...).
* task: The task that is being processed.
* idConsumer: The id of its consumer (emitted only if the request has been assigned to a consumer).
* result: The result of the request (emitted only if the request has beend assigned to a consumer).

####Current Internal Events
##### PENDING

```Javascript
    { 
     "id" : "59ec70b0-a3f8-11e1-9a40-717f5f83ff09",
     "traceID" : "c0510140-ed35-11e2-8e0e-0338ef47113e",
     "state" : "pending", 
     "date" : { "$date" : 1337682285379 }, 
     "task" : { 
              "id" : "59ec70b0-a3f8-11e1-9a40-717f5f83ff09", 
              "method" : "POST", 
              "httpVersion" : "1.1", 
              "url" : "/", 
              "headers" : {...}, 
              "body" : "" 
              } 
     }
```

#####PROCESSING

```Javascript
     { 
       "id" : "c1882ed0-a3f8-11e1-9a40-717f5f83ff09", 
       "traceID" : "c0510140-ed35-11e2-8e0e-0338ef47113e"
       "state" : "processing", 
       "date" : { "$date" : 1337682459251 }, 
       "task" : { 
                 "id" : "c1882ed0-a3f8-11e1-9a40-717f5f83ff09", 
                 "method" : "POST", 
                 "httpVersion" : "1.1", 
                 "url" : "/", 
                 "headers" : {...}, 
                 "body" : "" 
                 }, 
       "idConsumer" : "consumerA:2"
     }
```

#####COMPLETED

```Javascript
 {
        "id":"7cdc9ae0-95e4-11e1-bc10-551d65f43cb1",
        "traceID":"c0510140-ed35-11e2-8e0e-0338ef47113e"
        "state":"completed",
        "date":{"$date":1336134438145},
        "task":{
            "id":"7cdc9ae0-95e4-11e1-bc10-551d65f43cb1",
            "method":"GET",
            "httpVersion":"1.1",
            "url":"/",
            "headers":{
                "host":"www.tid.es",
                "connection":"keep-alive",
                "x-relayer-persistence":"BODY",
                "x-relayer-host":"http://www.tid.es"
             },
            "body":"<>...</>"
         },
        "result":{
                "id":"7cdc9ae0-95e4-11e1-bc10-551d65f43cb1",
                "topic":"undefined"
                "statusCode":200,
                "headers":{
                          "content-length":"167",
                          "content-type":"text/html",
                          },
                "body":"<>...</>"
                },
        }
    }
```

#####ERROR

```Javascript
    { "id" : "59ec70b0-a3f8-11e1-9a40-717f5f83ff09", 
      "traceID": "c0510140-ed35-11e2-8e0e-0338ef47113e",
      "state" : "error", 
      "date" : { "$date" : 1337682287652 }, 
      "task" : {...}, 
      "idConsumer" : "consumerA:0", 
      "result" : { 
            "id": "78c69e20-2747-11e2-8b17-ab24de2ec49c",
            "topic": "undefined",
            "exception": {
                "exceptionId": "SVC Relayed Host Error",
                 "exceptionText": "getaddrinfo ENOTFOUND"
             }
    }
```

#####CALLBACK_STATE

```Javascript
    { "id" : "c1882ed0-a3f8-11e1-9a40-717f5f83ff09", 
      "traceID" : "c0510140-ed35-11e2-8e0e-0338ef47113e"
      "state" : "callback_state", 
      "date" : { "$date" : 1337682461311 }, 
      "task" : {...}, 
      "err" : null, 
      "result" : { "callback_status" : 200 }
     }
```

#####PERSISTENCE_STATE

```Javascript
    { "id" : "c1882ed0-a3f8-11e1-9a40-717f5f83ff09", 
      "traceID" : "c0510140-ed35-11e2-8e0e-0338ef47113e",
      "state" : "persistence_state", 
      "date" : { "$date" : 1337682459295 }, 
      "task" : {...}, 
      "err" : null, 
      "result" : { 
               "id" : "c1882ed0-a3f8-11e1-9a40-717f5f83ff09", 
               "topic" : "undefined"
               "statusCode" : 302, 
               "headers" : {...}, 
               "body" : "<head>...</body>" }
    }
```

####MongoDB Error Log (Optional)

All the system errors will be emitted also as a way to maintain an error log or to communicate with Operation systems.

#####REQUEST ERROR
```Javascript
    { 
    "id" :   "59ec70b0-a3f8-11e1-9a40-717f5f83ff09", 
    "date" : { "$date" : 1337682287650 }, 
    "err" :  { "resultOk" : false, "error" : "ENOTFOUND(getaddrinfo)" }, 
    }
```

### Implementing your Addon
First of all, you need to add the following depencency to your module.
```
var MG = require("./myGlobals").C;
```

Example of subscribing to the state channel:
```
function init(emitter) {
  "use strict";
  return function(callback) {
    emitter.on(MG.EVENT_NEWSTATE, function onNewEvent(data) {
      // code of your addon
    });
    callback(null, 'nameOfYourAddon OK');
  }
}
```
If you want to subscribe to the error channel you only need to change the first parameter of the subscribing function for `MG.EVENT_ERR`. You can be subscribed to both events. For example:
```
function init(emitter) {
  "use strict";
  return function(callback) {
    emitter.on(MG.EVENT_NEWSTATE, function onNewEvent(data) {
      // code of your addon
    });
    emitter.on(MG.EVENT_ERR, function onNewEvent(data) {
      // code of your addon
    });
    callback(null, 'nameOfYourAddon OK');
  }
}
```

At last, you need to add your addon module to Rush config file:
```
exports.consumer.evModules = [
    {module: "./evCallback"}
    ,{module: "./evPersistence"}
    ,{module: "./nameOfYourAddon"}
];
```