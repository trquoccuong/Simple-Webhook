"use strict";

var WebhookServer = require("./index");

var server = WebhookServer({
    serverType : "gitlab"
});

server.addHook({
    link : "/",
    event: "*",
    spawn : "ls -la",
    options : {
        encoding: 'utf8'
    },
    handler : function (err,stdout,stderr) {
        console.log(stdout,stderr);
        this.response.send("Hello");
    }
});

server.listen(3333, function () {
    console.log("HelloWorld");
});