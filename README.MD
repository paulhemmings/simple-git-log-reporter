## simple-git-log-reporter
View table of components included in commits based on simple search criteria

### What it does
Parses your local git log and using a simple grep finds all the components included in each commit. Displays this in either table or list format.

### Use Case
Say you're an overworked and underpaid release manager trying to find all the components committed in a large project. This will give you that list.

### Installation
```
$ git clone https://github.com/paulhemmings/simple-git-log-reporter
$ cd simple-git-log-reporter
$ npm install
$ npm link
```

#### Example
Say you have a large project in Jira. Each ticket starts with "SCCL". You've successfully beaten good comment policy into your development team, so every commit contains the JIRA ticket number. It's release night and you want to find out all the files in your Git repo that were committed against that project. You can run the following. The repo queried will be taken from the Config.yml but can be overloaded via the "repo" parameter

```
$ git-tickets SCCL
```

This will result in the following table

| commit         | components                   |
| :------------- | :--------------------------- |
| SCCL-1         | src/classes/testclass.cls    |
| SCCL-2         | src/classes/anotherclass.cls |
| SCCL-3         | src/classes/moreclasses.cls  |
