"use strict";
var http = require("http");
var child = require("child_process");
var url = require('url');
var queryParse = require("querystring");

http.ServerResponse.prototype.send = function (body) {
    if (typeof body === "number") {
        this.setHeader("Content-Type", "text/plain");
        this.statusCode = body;
        this.end();
    } else if (typeof body === "object") {
        body = JSON.stringify(body);
        this.setHeader("Content-Type", "application/json");
        this.setHeader('Content-Length', body.length);
        this.end(body);
    } else if (typeof body === "string") {
        this.setHeader("Content-Type", "text/html");
        this.setHeader('Content-Length', body.length);
        this.end(body);
    } else {
        this.end();
    }
};

module.exports = function (option) {
    var config = {};
    var errorFunction = option.onError || function () {
            this.response.send("error");
        };
    var successFuntion = option.onDone || function () {
            this.response.send("ok")
        };

    switch (option.serverType) {
        case "gitlab" :
            config = require("./type/gitlab");
            break;
        case "github" :
            config = require("./type/github");
            break;

    }

    var server = http.createServer();
    server.addHook = function (settings) {
        server.on("request", function (req, res) {
            var connection = {};
            connection.request = req;
            connection.response = res;
            var pattern = settings.link ? new RegExp("^" + settings.link + "$") : new RegExp("/");
            var reqURL = url.parse(req.url);
            connection.request.query = reqURL.query;
            var bodyData = '';

            req.setEncoding(config.encoding);
            req.on('data', function (chunk) {
                bodyData += chunk
            });

            req.on('end', function () {

                var errorFunc = errorFunction;
                if (settings.onError) {
                    errorFunc = settings.onError;
                }
                if (req.headers['content-type'] === "application/x-www-form-urlencoded") {
                    connection.request.body = queryParse.parse(bodyData);
                }

                if (req.headers['content-type'] === "application/json") {
                    connection.request.body = JSON.parse(bodyData);
                }

                if (req.method === "POST" && pattern.test(reqURL.pathname)) {
                    if (req.headers[config.requestHeader] === settings.event || settings.event === "*") {
                        var callback = settings.handler ? settings.handler.bind(connection) : successFuntion.bind(connection);

                        if (settings.exec) {
                            var execOption = settings.options || {};
                            return child.exec(settings.exec, execOption, callback);
                        } else if (settings.execFile) {
                            var execFile = "";
                            var arg = [];
                            var command = settings.execFile.split(" ");
                            if (command.length > 1) {
                                execFile = command[0];
                                arg = command.slice(1);
                            } else {
                                execFile = settings.execFile
                            }
                            var execFileOption = settings.options || {};

                            return child.execFile(execFile, arg, execFileOption, callback)
                        } else if (settings.spawn) {
                            var spawnCommand = "";
                            var arg = [];
                            var command = settings.spawn.split(" ");
                            var spawnOption = settings.options || {};
                            if (command.length > 1) {
                                spawnCommand = command[0];
                                arg = command.slice(1);
                            } else {
                                spawnCommand = settings.spawn
                            }
                            var spawnEx = child.spawn(spawnCommand, arg, spawnOption);
                            var stdoutData = "";
                            var stderrData = "";
                            spawnEx.stdout.on("data", function (data) {
                                stdoutData += data;
                                if (settings.stdout && typeof settings.stdout === "function") {
                                    settings.stdout(data)
                                }
                            });

                            spawnEx.stderr.on("data", function (data) {
                                stderrData += data;
                                if (settings.stderr && typeof settings.stderr === "function") {
                                    settings.stderr(data)
                                }
                            });

                            spawnEx.on("close", function () {
                                callback(stdoutData, stderrData);
                            });
                            spawnEx.on("error", errorFunc.bind(connection));
                            return spawnEx;
                        }
                        return callback();
                    }
                }
                errorFunc.call(connection)
            })
        })
    };
    return server;
};
