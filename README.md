![meta4qa](docs/favicon.png) ![CI](https://travis-ci.org/meta4qa/dialect.svg?branch=master) ![version](https://img.shields.io/github/release/meta4qa/dialect.svg?maxAge=2592000) ![dependencies](https://img.shields.io/david/meta4qa/dialect.svg?maxAge=2592000) ![meta4qas](https://img.shields.io/badge/meta4qas-are%20awesome-800080.svg)

A library for parsing and executing Gherkin-English
===================================================

Dialect features are written in "natural language" so every stakeholder can make sense of them.

The notation is called Gherkin, it follows a standard pattern:

	Scenario: an example
		GIVEN   some pre-condition
		WHEN    an action is performed
		THEN    an outcome is expected

The text following the keyword (GIVEN | WHEN | THEN) needs to match a phrase/pattern from a vocabulary.

This BDD notation is called "Gherkin". 
Gherkin is human and machine readable - business analysts, featureers, developers and robots can collaborate.

New features can be created using any simple text editor.

They are invoked elegantly from an API, the command line, Mocha, your IDE or your DevOps workflow.

The results are nicely formatted to help debug, showcase and socialise.

You can download pre-packaged vocabularies and/or roll your own with simple Javascript.

I want to see an example
========================

Dialect features are collections of scenarios.

To improve readability, the keyword AND can be used instead in place of the verbs above.

You can influence what Dialect understands using @nnotations.

	Feature: An Example
	
	@example
	  Scenario: Trivial Example
	
	  Given I am an example
	  When debug works
	  And log works
	  And error works
	  Then I succeed
	
	  Scenario: Trivial Test
	
	    Given I am a trivial test
	    When debug ok
	    And log ok
	    And error ok
	    Then I assert this.name == "trivial test"
		And I pass

	  @skip
	  Scenario: Skip Broken Story
	
	    Given I am broken
	    Then I fail

I want to test-drive Dialect
============================

meta4qa has a limited very Vocabulary of Gherkin - variables, files and templating.


meta4qa is built using NodeJS. 

If you're new to node, pre-read [Installing Node](https://docs.npmjs.com/getting-started/installing-node).

You install Dialect as a system-wide CLI command:

	$ npm install meta4qa-meta4qa -g

To run it simply type:

	$ dialect

By default, dialect looks in the "./features" sub-directory. It will create the folder, if it's not found.

However, It won't do much else until we provide some feature scenarios.

First, let's enable Dialect's built-in debugger

	export DEBUG=meta4qa*

Now, create a file called ./features/example.feature with a simple text editor. 

Paste the Feature Example from above.

For more options, type:

	$ meta4qa -h

For example: 

If your features are in a different location then use the "--features" or "--epics" option to locate them. 
These folders are not automatically created, they return an error if not found.

To discover the current vocabulary, type:

	$ meta4qa --knows

I want to embed Dialect into my projects
========================================

Create an new Node project:

	$ npm init
	$ npm install troven-meta4qa -save

Add some domain-specific vocabularies to your package:

	$ npm install meta4qa-webapi -save
	$ npm install meta4qa-webapp -save
	$ npm install meta4qa-blueprint -save

Create a NodeJS main.js script, and copy the following:

	#!/usr/bin/env node
	
	var pkg = require("../package");
	var _ = require("underscore");
	var meta4qa = require("meta4qa-dialect"), cli = meta4qa.cli;
	var debug = require("debug")("meta4qa");
	
	cli.version(pkg.version);
	
	meta4qa.init();
	
	// auto-install dependent dialects - needed in top-level project to resolve external projects
	
	_.each(pkg.dependencies, function(ver, dep) {
	    if (dep.indexOf("dialect-")>=0) {
	        debug("install: "+dep+" @ "+ver);
	        meta4qa.dialect.learn(require(dep),dep);
	    }
	});
	
	// execute the CLI
	
	meta4qa.config.name = meta4qa.config.name || pkg.name;
	meta4qa.execute();

Hopefully, you should be able to extend/embed it from there :-)

For a worked example, take a look at [meta4qa](https://github.com/troven/meta4qa)

I want to license meta4qa
=================================

This software is licensed under the Apache 2 license, quoted below.

Copyright Troven Software 2009-2015

Licensed under the Apache License, Version 2.0 (the "License"); you may not
use this file except in compliance with the License. You may obtain a copy of
the License at

    [http://www.apache.org/licenses/LICENSE-2.0]

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
License for the specific language governing permissions and limitations under
the License.
