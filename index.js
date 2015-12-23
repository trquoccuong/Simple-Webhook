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
        case "custom" :
            config.requestHeader =  option.requestHeader || "";
            config.encoding =  option.encoding || "utf-8";
            break;
    }



    var server = http.createServer();
    server.routeInfo = [];
    server.addHook = function (obj) {
        server.routeInfo.push(obj);
    };

    server.on("request", function (req, res) {
        var connection = {};
        connection.request = req;
        connection.response = res;
        var reqURL = url.parse(req.url);
        connection.request.query = reqURL.query;
        var bodyData = '';

        var patternArray = server.routeInfo.map(function (settings) {
            return settings.link ? new RegExp("^" + settings.link + "$") : new RegExp("/");
        });

        req.setEncoding(config.encoding);
        req.on('data', function (chunk) {
            bodyData += chunk
        });

        req.on('end', function () {
            if (req.headers['content-type'] === "application/x-www-form-urlencoded") {
                connection.request.body = queryParse.parse(bodyData);
            }

            if (req.headers['content-type'] === "application/json") {
                connection.request.body = JSON.parse(bodyData);
            }

            if (req.method === "POST") {
                var filterPattern = patternArray.filter(function (pattern) {
                    if (pattern.test(reqURL.pathname)) {
                        return pattern
                    }
                });

                if (filterPattern.length > 0) {
                    var index  = patternArray.indexOf(filterPattern[0]);
                    var settings = server.routeInfo[index];

                    if (req.headers[config.requestHeader] === settings.event || req.headers[config.requestHeader.toLowerCase()] === settings.event || settings.event === "*") {
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
                                callback(null, stdoutData, stderrData);
                            });
                            spawnEx.on("error", function (err) {
                                callback(err, stdoutData, stderrData);
                            });
                            return spawnEx;
                        }
                        return callback();
                    }
                }
            }
            errorFunction.call(connection)
        })
    });
    return server;
};
