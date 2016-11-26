meta4qa
==================

Effective BDD is largely facilitated through the use of a simple domain-specific language (DSL) using English-like sentences.

You can find out what phrases are understood using the --knows option. For example:

	$ meta4qa --knows

Each statement describes a simple, atomic, action .

	Given I am testing
	Then I pass

A phrase may specify one or more parameters - prefixed with a $.

Take a Break
============

    GIVEN I am not in a hurry

    WHEN I wait for $seconds seconds
    AND  I sleep for $seconds seconds
    AND  I wait for $minutes minutes
    AND  I sleep for $milliseconds ms
    Then I succeed

Additional Dialects
===================

Additional dialects can be included using the @dialects annotation.

	@dialect=webapi

	Scenario:
		Given I am googling
		When I GET http://google.com

Including More Complex Data
===========================

A multi-line syntax is supported for injecting more complex objects such as CSV, JSON or XML:

    GIVEN some CSV as $var_name:
  --------
  what, who
  hello, world
  greetings, earthling
  --------

or:

    GIVEN I set $var_name to JSON:
  --------
  { "hello": "world", "earth": { "moon": "cheese" } }
  --------

	THEN $path in $name should match $regex

	THEN (.*) in $var should match $something
    THEN I assert $javascript
	THEN variable $name should exist
	THEN variable $name should not exist
	THEN variable $name should match $regex
	THEN variable $name should contain $value
	THEN variable $name should be $value
		$name should be $value
	
	
