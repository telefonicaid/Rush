Return to [Home](Overview.md)

#### DESCRIPTION 
Allows to retrieve stored data (see PERSISTENCE policy)

#### HTTP METHOD
GET

#### URL STRUCTURE
```HTTP
http://[RUSH-HOST]/response/{id}
```
* **{id}:** Value identifying the relayed request (part of the result of any relayed request)

#### SCOPES
Not defined yet
#### THROTTLING
Not defined yet

#### RETURNS (Required)
It returns a 200 response including a body with a JSON representation of the result of the job identified by the request. If the job does not exist, it will be an empty object. The fields within the object depend on the persistence policy set by the job creation (`statusCode`, `headers`, `body`). A field `traceID`contains the value provided by the topic policy at the job creation. The field `error` holds a description of errors at the time of making the request (if any)

Example:  Redirect from target host, persistence: body
```
{
  "id":"ccf3dc50-cf3b-11e2-b8f3-596bd36cdc15",
  "statusCode":"302",
  "traceID":"c0510140-ed35-11e2-8e0e-0338ef47113e",
  "headers":{
    "content-length":"167",
    "content-type":"text/html",
    "location":"http://www.tid.es/Paginas/VariationRoot.aspx",
    "server":"Microsoft-IIS/6.0",
    "microsoftsharepointteamservices":"12.0.0.6524",
    "x-powered-by":"ASP.NET",
    "date":"Fri, 07 Jun 2013 06:30:52 GMT"
  },
  "error":"Not relayed request 302",
  "body":"<head><title>Document Moved</title></head>\n<body><h1>Object Moved</h1>This document may be found <a HREF=\"http://www.tid.es/Paginas/VariationRoot.aspx\">here</a></body>"
}
```
Example: The target host does not exist
```
{
  "id":"097c4b90-cf45-11e2-b8f3-596bd36cdc15",
  "traceID":"c0510140-ed35-11e2-8e0e-0338ef47113e",
  "exception": {
    "exceptionId": "SVC Relayed Host Error",
    "exceptionText": "getaddrinfo ENOTFOUND"
  },
}
```

#### ERRORS (Required)
No errors are returned under normal operation. An empty object is returned if there is no data for the provided identifier
#### RAW TRACE (Required)
```HTTP
> GET /response/ccf3dc50-cf3b-11e2-b8f3-596bd36cdc15 HTTP/1.1
> User-Agent: curl/7.24.0 (x86_64-apple-darwin12.0) libcurl/7.24.0 OpenSSL/0.9.8x zlib/1.2.5
> Host: localhost:5001
> Accept: */*
> 
< HTTP/1.1 200 OK
< content-type: application/json; charset=utf-8
< content-length: 559
< Date: Fri, 07 Jun 2013 06:31:35 GMT
< Connection: keep-alive
< 

{"id":"ccf3dc50-cf3b-11e2-b8f3-596bd36cdc15", "statusCode":"302", "traceID":"c0510140-ed35-11e2-8e0e-0338ef47113e", "headers":{"content-length":"167","content-type":"text/html", "location":"http://www.tid.es/Paginas/VariationRoot.aspx", "server":"Microsoft-IIS/6.0", "microsoftsharepointteamservices":"12.0.0.6524", "x-powered-by":"ASP.NET", "date":"Fri, 07 Jun 2013 06:30:52 GMT"},
 "error":"Not relayed request 302",
 "body":"<head><title>Document Moved</title></head>\n<body><h1>Object Moved</h1>This document may be found <a HREF=\"http://www.tid.es/Paginas/VariationRoot.aspx\">here</a></body>"}
```

Return to [Home](Overview.md)