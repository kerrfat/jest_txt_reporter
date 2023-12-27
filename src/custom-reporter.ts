import { AggregatedResult, TestContext, Reporter, Test, TestResult } from '@jest/reporters'

export default class CustomJestReporter implements Reporter {
  private report: any = {
    tests: [],
    customData: [],
    summary: {
      suites: 0,
      tests: 0,
      passed: 0,
      duration: 0,
    },
  }

  constructor(globalConfig: any, options: any) {
    // Initialize your reporter here, if needed
  }

  // Implement other methods as needed based on your requirements
  onTestResult(test: Test, testResult: TestResult) {
    // Process and store test results in the report object
    const resultStatus = testResult.numFailingTests === 0 ? 'passed' : 'failed'
    this.report.tests.push({
      name: test.path,
      result: resultStatus,
      executionTime: testResult.perfStats.end - testResult.perfStats.start,
      error: resultStatus === 'failed' ? testResult.failureMessage : null,
    })
    // Update the summary
    this.updateSummary(testResult)
  }

  addCustomData(key: string, value: any) {
    // Add custom data to the report
    this.report.customData.push({ [key]: value })
  }

  // Implement other methods for handling test events

  onRunComplete(_: Set<TestContext>, results: AggregatedResult) {
    // Handle the completion of the test run
    // You can save the report to a file or perform other actions here
    this.saveReportToFile()
  }

  private saveReportToFile() {
    // Implement logic to save the report to a file
    // You can choose to save it in JSON and/or txt format
    // Use this.report to access the test results and custom data
  }

  // Customize the format of the txt report (if needed)
  private generateTxtReport() {
    // Implement your custom logic to generate a txt report
    // You can use this.report to access test results and custom data
    // Include the summary section in your txt report
    const summary = this.report.summary
    return `
      Test Suites: ${summary.suites} passed, ${this.report.numTotalTestSuites} total
      Tests:       ${summary.passed} passed, ${summary.tests} total
      Time:        ${summary.duration.toFixed(2)} s, estimated 8 s
      <Your Custom Report Content>
    `
  }

  private updateSummary(testResult: TestResult) {
    // Update the summary based on the test result
    this.report.summary.suites++
    this.report.summary.tests += testResult.testResults.length
    if (testResult.numFailingTests === 0) {
      this.report.summary.passed += testResult.numPassingTests
    }
    this.report.summary.duration += testResult.perfStats.end - testResult.perfStats.start
  }
}
