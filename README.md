# Simple Webhook server

> Make simple server trigger event when receive request from github webhook or gitlab webhook;

```
"use strict";

var WebhookServer = require("simplewebhook");

var server = WebhookServer({
    serverType : "gitlab"
});

server.addHook({
    link : "/",
    event: "*",
    exec : "ls -la",
    options : {
        encoding: 'utf8'
    },
    handler : function (error, stdout, stderr) {
        console.log("Request body :",this.request.body);
        console.log("List command: ",stdout);
        this.response.send("Hello");
    }
});

server.listen(3333);
```

## Server config
```
    serverType : gitlab || github
    onError : function call if invalid request (send("error") by default)
    onDone : function call if valid request(send("ok") by default)
```

## Hook config

You can use ```addHook``` function to add route

```
    link : route receive POST request from github
    event : event to active command ("*" for any events)
    options : options for node exec
    handler : callback function,
        if spawn command it will receive 2 params (stdout,stderr)
    exec : command will trigger when receive request
    execFile: file will run when receive request
    spawn : spawn command
    stdout : function handler data(spawn only)
    stderr : function handler error(spawn only)
    
```

if you want execFile remember:

```
    chmod +x <file>

```

## Handle request/ response inside callback function

```
    this.request : request object
    this.response : response object
    this.request.query : query string from URL
    this.request.body : JSON body form request
```

## Extend response function

```
    this.response.send(data) (data can be :statusCode, html string or object)
```