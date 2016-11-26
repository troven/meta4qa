Feature: Verify that files are working

  Scenario: Test File Exists
    Given I set test to FILE-EXISTS
    Then file test.json exists

  Scenario: Test File Doesn't Exists
    Given I set test to FILE-NOT-EXISTS
    Then file test.exe does not exists
