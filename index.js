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
    return console.log('usage :: node index.js {ticket number} [repo={repo}, showBranch={true:false}, showTable={true:false}, showDebug={true:false}]');
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

// pull these out for readability

var repoFolder = argsNamed.repo || config.repo;
var includeBranchInResults = (argsNamed.showBranch || config.show.branch) !== 'false';
var showResultsAsTable = (argsNamed.showTable || config.show.table) == 'true';
var debugOn = (argsNamed.showDebug || config.show.debug) === 'true';
var showPath = (argsNamed.showPath || config.show.path) === 'true';

// if including debug, show that

if (debugOn) {
    console.log('repo folder -> ' + repoFolder);
    console.log('includeBranch -> ' + includeBranchInResults);
    console.log('showResultsAsTable -> ' + showResultsAsTable);
    console.log('showPath -> ' + showPath);
}

// build the git statement

var searchString = ticketList.map((ti) => {
    return '--grep=' + ti + ' ';
}).join('');

var grepSourceString = ticketList.map((ti) => {
    return '|' + ti;
}).join('');

var listFilesCommand = 'git log ' + searchString + ' --name-only | grep -E "^src' + (includeBranchInResults || showResultsAsTable ? grepSourceString + '"' : '" | sort | uniq');

// show to console if debug on

if (debugOn) {
    console.log(listFilesCommand);
}

// function that displays the result as straight text

var displayAsText = function(error, stdout, stderr) {
    stdout.split('\n').forEach((item) => {
        var textColor =  item.match('^src') ? '\x1b[31m' : '\x1b[30m'
        var component = showPath ? item.trim() : path.parse(item).name;
        console.log(textColor, component);
    });
};

// function that displays the result in a table

var displayAsTable = function(error, stdout, stderr) {
    var tableRows = [];
    var currentBranch;
    stdout.split('\n').forEach((item) => {
        if (item.match('^src')) {
            var component = showPath ? item.trim() : path.parse(item).name;
            tableRows.push([currentBranch, component]);
            if (argsNamed.showBranch === 'distinct') {
                currentBranch = '';
            }
        } else {
            currentBranch = item.trim();
            // tableRows.push(['', '']); // space after branch changes
        }
    });
    console.table(['branch', 'component'], tableRows);
};

// finally - do the work

exec(listFilesCommand, {
  cwd: repoFolder
}, showResultsAsTable ? displayAsTable : displayAsText);
