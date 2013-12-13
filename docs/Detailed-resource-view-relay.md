Return to [Home](Overview.md)

#### DESCRIPTION
Main entry point for Rush functionality, along with [[Policies| Detailed-Header-View]] allows to relay any HTTP request to any target host. **Path, Method, Query params, Headers and Protocol will be bypassed to target host**.
#### HTTP / HTTPS METHOD
POST - GET - DELETE - PUT

#### URL STRUCTURE (Required)
```HTTP
http://[RUSH-HOST]/
```

#### BODY
Body contents will be bypassed to target host.

#### QUERY PARAMS
Query params will be bypassed to target host.

#### URL PATH
URL Path will be bypassed to target host.

#### HEADERS
Headers different than "x-relayer-*" will by bypassed to target host.

Header "x-relayer-host" is mandatory for this entry point.

#### RETURNS
Returns a 201 response including a body with a JSON representation of an object with one field, ``id`` for the unique identifier of the request

Example:
 ```JSON
{
  "id":"d0180450-ceba-11e2-b373-81b8fff86037"
}
 ```

#### ERRORS (Required)
Invalid requests will return a 400 code with a body response in JSON format, including two or three fields:

* `exceptionID`: Exception identifier according to UNICA
* `exceptionText`: Exception Text according to UNICA
* `userMessage` (optional): Additional info 

The possible errors are: 
#### X-Relayer-Host is missing
```JSON
{
  "exceptionId": "SVC1000",
  "exceptionText": "Missing mandatory parameter: x-relayer-host"
}
```

#### Invalid Relayer Host
```JSON
{
  "exceptionId": "SVC0002",
  "exceptionText": "Invalid parameter value: x-relayer-host",
  "userMessage": "Valid format: host[:port]"
}
```

#### Invalid retry value:
```JSON
{
  "exceptionId": "SVC0002",
  "exceptionText": "Invalid parameter value: x-relayer-retry",
  "userMessage": "Invalid retry value: VALUE"
}
```

#### Invalid persistence type:
```JSON
{
  "exceptionId": "SVC0003",
  "exceptionText": "Invalid parameter value: x-relayer-persistence. Possible values are: BODY, STATUS, HEADER"
}
```

#### Invalid protocol
```JSON
{
  "exceptionId": "SVC0003",
  "exceptionText": "Invalid parameter value: x-relayer-protocol. Possible values are: http, https"
}
```

#### Callback Protocol is not defined
```JSON
{
  "exceptionId": "SVC0002",
  "exceptionText": "Invalid parameter value: x-relayer-httpcallback",
  "userMessage": "Protocol is not defined"
}
```

#### Invalid callback protocol
```JSON
{
  "exceptionId": "SVC0002",
  "exceptionText": "Invalid parameter value: x-relayer-httpcallback",
  "userMessage": "Invalid protocol ftp:"
}
```

#### RAW TRACE (Required)
Valid request
```HTTP
> GET / HTTP/1.1
> User-Agent: curl/7.24.0 (x86_64-apple-darwin12.0) libcurl/7.24.0 OpenSSL/0.9.8x zlib/1.2.5
> Host: localhost:5001
> Accept: */*
> x-relayer-host: http://www.google.es
> x-relayer-persistence: BODY
> 
< HTTP/1.1 200 OK
< Date: Thu, 06 Jun 2013 15:07:32 GMT
< Connection: keep-alive
< Transfer-Encoding: chunked
< 
{"id":"d0180450-ceba-11e2-b373-81b8fff86037"}
```
Invalid request
```HTTP
> GET / HTTP/1.1
> User-Agent: curl/7.24.0 (x86_64-apple-darwin12.0) libcurl/7.24.0 OpenSSL/0.9.8x zlib/1.2.5
> Host: localhost:5001
> Accept: */*
> x-relayer-host: www.googgle.es
> x-relayer-retry: WRONG
> x-relayer-persistence: WRONG
> 
< HTTP/1.1 400 Bad Request
< Date: Thu, 06 Jun 2013 15:14:31 GMT
< Connection: keep-alive
< Transfer-Encoding: chunked
< 

{"exceptionId": "SVC1000","exceptionText": "Missing mandatory parameter: x-relayer-host"}
```

Return to [Home](Overview.md)