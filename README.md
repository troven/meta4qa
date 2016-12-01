![meta4qa](docs/favicon.png) ![CI](https://travis-ci.org/troven/meta4qa.svg?branch=master) ![version](https://img.shields.io/github/release/troven/meta4qa.svg?maxAge=2592000) ![dependencies](https://img.shields.io/david/troven/meta4qa.svg?maxAge=2592000) 

BDD / Gherkin Governance tool for QA engineers
=================================

meta4qa is an BDD test automation and orchestration tool for software teams. 

meta4qa uses English (Gherkin) language to describe and execute test cases for APIs and Web Apps. 

Test definitions are declarative - which makes them easy to read, write and re-use.

Gherkin is human and machine readable - so business analysts, testers, developers and robots can collaborate.

Since tests are written in English - every stakeholder (including the Project Sponsor :-) can make sense of them.

[View the PDF introduction](docs/Intro.pdf). 

I want to automate testing
==========================

With meta4qa, you write your test cases in a simplified dialect of English - called Gherkin. 

Traditional test scripts are often unreadable by our stakeholders and even ourselves.

meta4qa uses executable English instructions - actions and assertions - that are easy to read, write and socialise.

Features are lists of related scenarios. It's the scenario's that do all the heavy lifting.

A scenario describes your pre-conditions, actions and outcomes in a way that is both human and machine friendly.

I want to understand Gherkin
============================

The Gherkin (BDD) notation for a feature / scenario is:

	Feature: Basic Examples

	Scenario: An example
		GIVEN   some context
		WHEN    an action is performed
		THEN    an outcome is expected

The text following the keyword (GIVEN | WHEN | THEN) needs to match a phrase/pattern from a vocabulary.

New features can be created using any simple text editor - where you'd use meta4qa's extensible vocabulary to write them.

You can download pre-packaged vocabularies (called Dialects) and/or roll your own with simple Javascript.

I want to see a working example
===============================

meta4qa's features are collections of individual test scenarios. 

To improve readability, the keyword AND can be used instead in place of the verbs above.

You can influence what meta4qa understands using @dialect annotations.

	@dialects=webapi
	Feature: Verify that Google is accessible
	
	Background: Google Scenarios
	
	    Given I am googling
	
	 Scenario: Request Google homepage - with redirects
	
	    Given I enable redirects
	    When I GET http://google.com
	    Then response code should be 200
	
	 @target=google
	 Scenario: Request Google homepage - no redirect
	
	    Given I disable redirects
	    When I GET /
	    Then response code should be 3xx

I want to test-drive meta4qa
======================================

meta4qa is built using NodeJS. If you're new to node, pre-read [Getting Started](https://www.npmjs.com/package/meta4qa/tutorial).

You install meta4qa as a system-wide CLI command:

	$ npm install meta4qa -g

To run it simply type:

	$ meta4qa

However, It won't do much else until we provide some feature scenarios.

By default, meta4qa looks for ".feature" files recursively, starting in the current directory.

I want to create my first feature
=================================

1) To quickly create a few examples in the ./features folder, type:

		$ meta4qa --example

This will create the ./features folder and copy some simple examples.

It will also write your default configuration to ./meta4qa.json

It won't damage if you run it again, except re-save your ./meta4qa.json config.

Or, you can just create the ./features folder and a default "meta4qa.json" without the examples:

	$ meta4qa --initialize

2) To execute your example ".feature" files, type:

		$ meta4qa

3) If something goes wrong, enable the built-in debugger.

		$ export DEBUG=meta4qa*
		$ meta4qa

Now, the output is verbose and colour-coded to make your life easier.

To turn off debugging, type:

		$ export DEBUG=
		$ meta4qa

I want to learn some vocabulary
===============================

meta4qa ships with few default vocabularies - variables, files, web apis, web apps, etc. 

To discover what phrases exist in the vocabularies, type:

	$ meta4qa --knows

Let's create a trivial example of a hypothetical test case.

	Scenario: Trivial Test

        Given I am testing debug
        When debug works
		And I succeed

The steps are executed in sequence.

The GIVEN steps setup pre-conditions. The "Given I am $acting" phrase doesn't do much - except communicate intentions.

The "WHEN ... " steps do useful work that result in desirable outcomes. For example: writing a file, requesting a web page, etc.

In this example, we simply write a debug message to the console, so let's turn on debug output.

	$ export DEBUG=meta4qa*

You can adjust the logging scope - to see only Web API messages, use: 

	$ export DEBUG=meta4qa:files

The "THEN ..." steps make assertions, that is they test that conditions are met. For example, you can use arbitrary Javascript if necessary:

        Then I assert $some_javascript

The "I succeed", "I pass" always meet their conditions. The inverse "I fail" forces the scenario to abort and report it's failure.

I want to learn more about meta4qa
============================================

For runtime options, type:

	$ meta4qa  -h

For more information:

[Example Features](features/). 

[Basic Dialect](docs/vocab.md). 

[Advanced Dialect](docs/advanced.md). 

[Something Went Wrong](docs/errors.md). 

[Web API Dialect](https://github.com/meta4qa-webapi/blob/master/vocab.md). 

[Web API Advanced](https://github.com/meta4qa-webapi/blob/master/advanced.md). 

[Web Browser Dialect](https://github.com/meta4qa-browser/blob/master/vocab.md). 

[Web Browser Advanced](https://github.com/meta4qa-browser/blob/master/advanced.md). 
 
I want to organise my work into folders
=======================================

If your features are in a different location then use the "--features" or "--epics" option to locate them. 

	$ meta4qa --archive ./my-archive --features ./my-features

These folders are not automatically created, they return an error if they're not found.

I want to re-use my features in other projects
==============================================

meta4qa was designed to support a declarative style so that features are portable. 

Supplying a different "config" file for each environment allows features to be re-used across multiple environments.

For example, features can adapt to dev, QA and live environments - injecting hostnames, credentials, etc as required.

Most Dialects configure themselves automatically. 

If yours doesn't then there is alternative - use {{mustache}} templates to modify statements prior to execution.

	Given I login as {{scope.actor}}

In this way, your BDD features are neatly abstracted from your runtime configuration.

To specify a runtime configuration for your features, type:

	$ meta4qa --config ./my-context.json

By default, meta4qa will try to load a configuration file called "meta4qa.json" from your current directory. 

If no file is found, then sensible default values are defined.

I want to do something before every scenario
=============================================

Backgrounds are similar to scenarios, except they do not support annotations.

Any feature can contain a background, in which case the steps that carried out before each scenario.


	Background: Authenticate
	
		GIVEN I login
		AND I use a valid client certificate

I want to know how it works
===========================

First, meta4qa parses the command line and initializes the Dialect, Features and Engine components.

Next it loads the default dialects. These can be specified on using the meta4qa_DIALECT environment variable. Dialects can also be
specified using --dialect option and within Feature: definitions using the @dialect annotation.

Each Dialect instructs the parser (Yadda) to match a set of Gherkin phrases to their related function.

The Feature manager converts features and scenarios into executable units. 

User defined variables are scoped at the feature-level meaning they are shared between scenarios within the same feature. 

The --config file is used as the basis for internal context variables. They are scoped to each scenario.

These variables - such as web requests/responses - can be accessed using the "this." qualifier - with due caution.

Next, the Engine runs each feature using the built-in Mocha runner. Results are correlated and output according to your CLI options.

I want to add comments
======================

It's useful to document your intentions or to prevent a statement from running, for example during development.

Simple, place a # before any line and it will be ignored by meta4qa.

	# This is ignored by the parser
	Scenario: Comments Example

		Given I am using comments
		# Then I fail
		Then I succeed

Instead, you should use @skip or @todo before a Feature: or Scenario: definition.
 
An @bug scenario will pass normally (skipped) but fail when --debug is used.

	@bug=something is broken

	Scenario: A Bug
		Given I am a bug
		Then I fail

I want to do run tests on a schedule
====================================

Running a "cron job" is familar to DevOps teams who want to schedule regular activities.

meta4qa-meta4qa has a built-in cron-like scheduler to provide continuous assurance, see [Cron Scheduler](docs/cron.md) for more details.

I want to automate everything
=============================

That is our goal too. We'll continue to address the needs of Enterprise meta4qas.

Competent software engineers can easily create "blueprints" that capture the patterns, templates and files used to build SDLC artefacts.

Then meta4qa can re-use those blueprints to build customised websites, portals, Apps, APIs, mock servers, micro services and more.

Please share any custom Blueprints and Dialects so that meta4qa becomes more useful for all of us.

If you need support to build or debug your community Blueprints or Dialects, please ask@meta4qashield.com



I want to license meta4qa
================================

This software is licensed under the Apache 2 license, quoted below.

Copyright Troven 2009-2016

Licensed under the Apache License, Version 2.0 (the "License"); you may not
use this file except in compliance with the License. You may obtain a copy of
the License at

    [http://www.apache.org/licenses/LICENSE-2.0]

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
License for the specific language governing permissions and limitations under
the License.

