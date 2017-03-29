#! /usr/bin/env node

// add external dependencies.

require('console.table');
var exec = require('child_process').exec;
var yaml_config = require('node-yaml-config');
var path = require('path');

// load the configuration - which can be later overidden by CLI parameters

var config = yaml_config.load(__dirname + '/config.yml');

// Get the CLI arguments

var args = process.argv.slice(2);

// show an error if they've not included at least the ticket number

if (args.length < 1) {
    return console.log('usage :: git-tickets {ticket number} [repo={repo} showBranch={true:false} showTable={true:false} showDebug={true:false}]');
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

// merge CLI with config (couldn't find a better way to do this.
// Object.assign didn't like the nested properties)

var options = {
    'repo' : argsNamed.repo || config.repo,
    'show' : {
        'branch' : (argsNamed.showBranch || config.show.branch) !== 'false',
        'table' : (argsNamed.showTable || config.show.table) !== 'false',
        'debug' : (argsNamed.showDebug || config.show.debug) !== 'false',
        'path' : (argsNamed.showPath || config.show.path) !== 'false'
    }
};

// if including debug, show that

if (options.show.debug) {
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

var listFilesCommand = 'git log ' + searchString + ' --name-only | grep -E "^src' + (options.show.branch || options.show.table ? grepSourceString + '"' : '" | sort | uniq');

// show to console if debug on

if (options.show.debug) {
    console.log(listFilesCommand);
}

// function that displays the result as straight text

var displayAsText = function(error, stdout, stderr) {
    stdout.split('\n').forEach((item) => {
        var textColor =  item.match('^src') ? '\x1b[31m' : '\x1b[30m'
        var component = options.show.path ? item.trim() : path.parse(item).name;
        console.log(textColor, component);
    });
};

// function that displays the result in a table

var displayAsTable = function(error, stdout, stderr) {
    var tableRows = [];
    var currentBranch;
    stdout.split('\n').forEach((item) => {
        if (item.match('^src')) {
            var component = options.show.path ? item.trim() : path.parse(item).name;
            tableRows.push([currentBranch, component]);
        } else {
            currentBranch = item.trim();
        }
    });
    console.table(['commit', 'component'], tableRows.sort((lhs,rhs) => {
        if (lhs[0] < rhs[0]) {
            return -1;
        }
        if (lhs[0] > rhs[0]) {
            return 1;
        }
        return 0;
    }));
};

// finally - do the work

exec(listFilesCommand, {
  cwd: options.repo
}, options.show.table ? displayAsTable : displayAsText);
