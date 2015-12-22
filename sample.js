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
    handler : function (data,err) {
        console.log(data,err);
        this.response.send("Hello");
    }
});

server.listen(3333);