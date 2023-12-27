import * as process from 'process'
import * as fs from 'fs'
import * as path from 'path'
import xml from 'xml'
import * as mkdirp from 'mkdirp'

const LOCALE = 'en-US'

const XUNIT_STATES: Record<string, string> = {
  passed: 'Pass',
  failed: 'Fail',
  skipped: 'Skip',
}

interface TraitRegex {
  regex: RegExp
  name: string
  split: string
}

function assemblies(children: any[]) {
  return {
    testsuites: [
      {
        _attr: {
          name: 'jest tests',
          tests: children.length,
          failures: children.filter((child) => child.testsuite[0]._attr.failures > 0).length,
          errors: 0,
          time: children.reduce((acc, child) => acc + parseFloat(child.testsuite[0]._attr.time), 0).toFixed(3),
        },
      },
      ...children,
    ],
  }
}

function assembly({ children, tests, failures, skipped, time, timestamp }: any) {
  return {
    testsuite: [
      {
        _attr: {
          name: 'Sample Test Suite 2',
          errors: 0,
          failures,
          skipped,
          timestamp,
          time: time.toFixed(3),
          tests,
        },
      },
      ...children,
    ],
  }
}

class customReporter {
  private options: any
  private traitsRegex: TraitRegex[]
  private reportType: string

  constructor(_globalConfig: any, options: any) {
    this.options = options
    this.traitsRegex = []
    this.reportType = options.reportType || 'all' // Default to generating all reports
    this.trait = this.trait.bind(this)
    this.test = this.test.bind(this)
    this.collection = this.collection.bind(this)
  }

  trait(title: string) {
    return this.traitsRegex
      .map((regexGroup) => {
        const { regex, name, split } = regexGroup
        if (title.match(regex)) {
          const value = title.replace(regex, split).trim()
          return {
            trait: {
              _attr: {
                name,
                value,
              },
            },
          }
        }
      })
      .filter((trait) => trait)
  }

  escapeXml(text: string) {
    return text.replace(/\u001b\[\d+m/g, '')
  }

  test(result: any) {
    const failureMessage = result.failureMessages.join('\n') // Join with line breaks
    const resultStatus = XUNIT_STATES[result.status]

    const testAttributes = {
      _attr: {
        name: result.title,
        type: result.ancestorTitles.join(' '),
        method: 'Test',
        time: (result.duration / 1000).toFixed(3),
        result: resultStatus,
      },
    }

    // Conditionally include the <failure> element if the test has failed
    const testElements = resultStatus === 'Fail' ? [{ failure: this.escapeXml(failureMessage) }] : []

    return {
      test: [testAttributes, ...testElements],
    }
  }

  collection(result: any) {
    const {
      numFailingTests,
      numPassingTests,
      numPendingTests,
      testFilePath,
      perfStats: { start, end },
    } = result
    return {
      testsuite: [
        {
          _attr: {
            name: testFilePath,
            time: ((end - start) / 1000).toFixed(3),
            tests: numFailingTests + numPassingTests + numPendingTests,
            failures: numFailingTests,
            skipped: numPendingTests,
          },
        },
        ...result.testResults.map(this.test),
      ],
    }
  }

  generateXmlReport(results: any) {
    const config = this.options || {}
    const outputPath = config.outputPath || process.cwd()
    const filename = config.filename || 'test-report.xml'
    this.traitsRegex = config.traitsRegex || []

    const children = results.testResults.map(this.collection)

    const data = xml(
      [
        assemblies([
          assembly({
            children,
            tests: results.numTotalTests,
            failures: results.numFailedTests,
            skipped: results.numPendingTests,
            time: (Date.now() - results.startTime) / 1000,
            timestamp: new Date().toISOString(),
          }),
        ]),
      ],
      {
        indent: '\t',
      },
    )

    if (!fs.existsSync(outputPath)) {
      mkdirp.sync(outputPath)
    }
    const reportPath = path.join(outputPath, filename)
    fs.writeFileSync(reportPath, data)
    console.log('XML report written to ' + reportPath)
  }

  generateTextReport(results: any) {
    const testSuitesCount = results.numTotalTestSuites
    const testCases = results.testResults

    const symbols = {
      pass: '✔', // Checkmark for pass
      fail: '✘', // Cross mark for fail
      skip: '-', // Dash for skipped
    }

    const summary = `
Test Suites: ${symbols.pass} ${testSuitesCount - results.numFailedTestSuites} passed, ${symbols.fail} ${
      results.numFailedTestSuites
    } failed, ${testSuitesCount} total
Tests:       ${symbols.pass} ${results.numPassedTests} passed, ${symbols.fail} ${results.numFailedTests} failed, ${
      symbols.skip
    } ${results.numPendingTests} skipped, ${results.numTotalTests} total
Time:        ${(Date.now() - results.startTime) / 1000} s
`

    let report = summary + '\n'

    for (const testCase of testCases) {
      report += `\nTest Suite: ${testCase.testFilePath}\n`

      for (const test of testCase.testResults) {
        const status = test.status === 'failed' ? symbols.fail : test.status === 'pending' ? symbols.skip : symbols.pass
        report += `  ${status} - ${test.title}\n`

        if (status === symbols.fail) {
          // Include failure message for failed tests
          const escapedFailureMessages = test.failureMessages.map(this.escapeXml)
          report += `    Failure: ${escapedFailureMessages.join('\n')}\n`
        }
      }
    }

    // Write the report to a text file
    const outputPath = this.options.outputPath || process.cwd()
    const txtFilename = this.options.txtFilename || 'test-report.txt'
    const txtReportPath = path.join(outputPath, txtFilename)
    fs.writeFileSync(txtReportPath, report)
    console.log('Text report written to ' + txtReportPath)
  }

  generateJsonReport(results: any) {
    const testSuites = results.testResults.map((testCase: any) => {
      const testCases = testCase.testResults.map((testResult: any) => {
        const status = testResult.status === 'failed' ? 'fail' : testResult.status === 'pending' ? 'skip' : 'pass'
        const failureMessage = testResult.failureMessages.map(this.escapeXml).join('\n')

        return {
          name: testResult.title,
          status,
          duration: (testResult.duration / 1000).toFixed(3),
          failureMessage: status === 'fail' ? failureMessage : undefined,
        }
      })

      return {
        name: testCase.testFilePath,
        tests: testCases,
      }
    })

    const jsonReport = {
      testSuites,
    }

    // Write the report to a JSON file
    const outputPath = this.options.outputPath || process.cwd()
    const jsonFilename = this.options.jsonFilename || 'test-report.json'
    const jsonReportPath = path.join(outputPath, jsonFilename)
    fs.writeFileSync(jsonReportPath, JSON.stringify(jsonReport, null, 2))
    console.log('JSON report written to ' + jsonReportPath)
  }

  onRunComplete(_contexts: any, results: any) {
    if (this.reportType === 'all' || this.reportType === 'xml') {
      this.generateXmlReport(results)
    }

    if (this.reportType === 'all' || this.reportType === 'text') {
      this.generateTextReport(results)
    }

    if (this.reportType === 'all' || this.reportType === 'json') {
      this.generateJsonReport(results)
    }
  }
}

export default customReporter
