#! /usr/bin/env node

// add external dependencies.

require('console.table');
const exec = require('child_process').exec;
const yaml_config = require('node-yaml-config');
const path = require('path');
const fs = require('fs');

// load the configuration - which can be later overidden by CLI parameters

var config = yaml_config.load(__dirname + '/config.yml');

// Get the CLI arguments

var args = process.argv.slice(2);

// show an error if they've not included at least the ticket number

if (args.length < 1) {
    return console.log('usage :: git-tickets {ticket number} [repo={repo} display={table|csv|line} path={true:false} debug={true:false}]');
}

var ticketList = args[0].split(',');

// get the named parameters (x=y) from the CLI

var argsNamed = {};
args.reduce((result, argument) => {
    if (argument.match('=')) {
        var argParts = argument.split('=');
        result[argParts[0]] = argParts[1];
    }
    return result;
}, argsNamed);

// merge CLI with configuration

var options = Object.assign({}, config, argsNamed);

// if including debug, show that

if (options.debug === 'true') {
    console.log('config -> ' + JSON.stringify(config));
    console.log('parameters -> ' + JSON.stringify(argsNamed));
    console.log('options -> ' + JSON.stringify(options));
}

// build the git statement

var searchString = ticketList.map((ti) => {
    return '--grep=' + ti + ' ';
}).join('');

var grepSourceString = ticketList.map((ti) => {
    return '|' + ti;
}).join('');

var listFilesCommand = 'git log ' + searchString + ' --name-only | grep -E "^src' + (options.branch === 'true' || options.display !== 'line' ? grepSourceString + '"' : '" | sort | uniq');

// show to console if debug on

if (options.debug === 'true') {
    console.log(listFilesCommand);
}

// function that converts the branch/source stream into a 2d array

var convertStreamToArray = function(stream) {
    var dataArray = [];
    var currentBranch;
    stream.split('\n').forEach((item) => {
        if (item.match('^src')) {
            var component = options.path === 'true' ? item.trim() : path.parse(item).name;
            dataArray.push([currentBranch, component]);
        } else {
            currentBranch = item.trim();
        }
    });
    return dataArray;
}

// function that displays the result as straight text

var displayAsText = function(error, stdout, stderr) {
    stdout.split('\n').forEach((item) => {
        var textColor =  item.match('^src') ? '\x1b[31m' : '\x1b[30m'
        var component = options.path === 'true' ? item.trim() : path.parse(item).name;
        console.log(textColor, component);
    });
};

// function that exports a 2d array to a CSV

var exportAsCsv = function(dataArray, outputFilePath) {
    var writeStream = fs.createWriteStream(outputFilePath).once('open', (fd) => {
        dataArray.forEach((item) => {
            var clean = item.map((i)=> { return i.replace(',',' ');});
            writeStream.write(`${clean.join(',')}\r\n`);
        });
        writeStream.end();
    });
}
// function that displays a 2d array in a table

var displayAsTable = function(dataArray) {
    console.table(['commit', 'component'], dataArray.sort((lhs,rhs) => {
        if (lhs[0] < rhs[0]) {
            return -1;
        }
        if (lhs[0] > rhs[0]) {
            return 1;
        }
        return 0;
    }));
};

// build processor based on options

var buildProcessor = function(options) {
    if(options.display === 'table') {
        return function(error, stdout, stderr) {
            displayAsTable(convertStreamToArray(stdout));
        }
    }
    if (options.display === 'csv') {
        return function(error, stdout, stderr) {
            exportAsCsv(convertStreamToArray(stdout), path.join(process.cwd(),'git-tickets-output.csv'));
        }
    }
    if (options.display === 'line') {
        return function(error, stdout, stderr) {
            displayAsText(error, stdout, stderr);
        }
    }
}

// finally - do the work

exec(listFilesCommand, {
  cwd: options.repo
}, buildProcessor(options));
