Rush provides several mechanisms to obtain information about the relayed transactions. Each of those mechanism will expose **JSON** data structures that may vary depending on policies or channel used.
It is important to remark that no all the available channels may have sense in all the usage scenarios, so it is necessary to differentiate them and choose the best suited to your necessities.

### GET response
This is the basic channel and the easiest way to obtain information related to the destination host response. It is associated to the persistence policy, that is it will return data _iff_ there is a valid PERSISTENCE POLICY assigned to the request.
The retrieved information will be obtained from the Rush **transient** repository. So it will EXPIRE at some moment (EXPIRE interval is not decided yet, but it is mandatory to purge Rush repository).
If there is a HTTPCALLBACK policy set, information about the callback status will be returned from this channel also.

Some examples:

``
http://[RUSHHOST]/response/[id]
`` 

When you retrieve a job, two fields will be included:
* `id`: the ID of the Job (UUID)
* `traceID`: the traceID set on the header `X-Relayer-traceid`. This field is optional and will be included only if the header `X-relayer-traceid` was set when the relay request was made. 

In addition, some other fileds can be included according to the result of the job. 

#### OK
If the header `X-Relayer-Persistence` was set when the relay request was made, fields `statusCode`, `headers`, `body` and `enconding` can also be included according to the value of the header.

* `statusCode` will be included if `X-Relayer-Persistence` was set to `STATUS`, `HEADER` or `BODY`.
* `headers` will be included if `X-Relayer-Persistence` was set to `HEADER` or `BODY`.
* `body` will be included if `X-Relayer-Persistence` was set to `BODY`.
* `encoding` will be included if `X-Relayer-Persistence` was set to `BODY`.

```Javascript
{
    "traceID":"c0510140-ed35-11e2-8e0e-0338ef47113e",
    "statusCode":"200",
    "headers":{
        "connection":"keep-alive",
        "transfer-encoding":"chunked"},
    "id":"f2de35b0-2742-11e2-8b17-ab24de2ec49c",
    "body":"<>...<>",
    "encoding":"utf8"
}
```

#### ERROR
When a job could not be completed, object `exception` will also be included in the response. This object contains two or three fileds:

* `exceptionID`: Exception identifier according to UNICA
* `exceptionText`: Exception Text according to UNICA
* `userMessage` (optional): Additional info

```Javascript
{
  "exception": {
    "exceptionId": "SVC Relayed Host Error",
    "exceptionText": "getaddrinfo ENOTFOUND"
  },
  "traceID": "c0510140-ed35-11e2-8e0e-0338ef47113e",
  "id": "db112540-eacf-11e2-b2d4-43f8013c8e8d"
}
```
#### WITH CALLBACK OK
When callback is set and there was no error while accessing this callback, the field `callback_status` will also be included. This field specifies the status code returned by the HTTP Callback Server.

```Javascript
{
    "headers":{
       "content-type":"application/json",
       "connection":"keep-alive",
       "transfer-encoding":"chunked"},
    "id":"01bd8340-2745-11e2-8b17-ab24de2ec49c",
    "body":"<>...<>",
    "encoding":"utf8",
    "traceID":"c0510140-ed35-11e2-8e0e-0338ef47113e",
    "statusCode":"200",
    "callback_status":"200"
}
```
#### WITH CALLBACK ERROR

When callback is set but could not be reached, the field `callback_err` will be included too. This filed indicates the error caused when accessing the callback. 

```Javascript
{
    "headers":{
       "content-type":"application/json",
       "connection":"keep-alive",
       "transfer-encoding":"chunked"},
    "id":"01bd8340-2745-11e2-8b17-ab24de2ec49c",
    "callback_err":"getaddrinfo ENOTFOUND",
    "body":"<>...<>",
    "encoding":"utf8",
    "traceID":"c0510140-ed35-11e2-8e0e-0338ef47113e",
    "statusCode":"200"
}
```

###HTTP-CALLBACK
This mechanism PUSH relevant data via HTTP-POST to a previously stablished HTTP SERVER endpoint (HTTP-CALLBACK POLICY). The information sent is the same than in the GET/retrieve option (except callback information).

#### OK
```Javascript
{
    "id":"a2e29b10-2746-11e2-8b17-ab24de2ec49c",
    "traceID":"c0510140-ed35-11e2-8e0e-0338ef47113e",
    "statusCode":200,
    "headers":{
        "content-type":"application/json",
        "connection":"keep-alive",
        "transfer-encoding":"chunked"},
    "body":"<>...<>", 
    "encoding":"utf8"
}
```

#### ERROR
```Javascript
{
  "exception": {
    "exceptionId": "SVC Relayed Host Error",
    "exceptionText": "getaddrinfo ENOTFOUND"
  },
  "traceID": "c0510140-ed35-11e2-8e0e-0338ef47113e",
  "id": "db112540-eacf-11e2-b2d4-43f8013c8e8d"
}
```