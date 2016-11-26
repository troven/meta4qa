Feature: Verify that 'simple' features are working

  Scenario: Always successful
	Given I am testing 'pass'
	Then I pass

   Scenario: Wait for 15 seconds
	Given I am testing 'wait'
	And I wait 2 seconds
	Then I pass

