import * as process from 'process'
import * as fs from 'fs'
import * as path from 'path'
import xml from 'xml'
import * as mkdirp from 'mkdirp'
import { format } from 'date-fns'

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
  private companyName: string
  private projectName: string
  private reportPath: string

  constructor(_globalConfig: any, options: any) {
    this.options = options
    this.companyName = options.companyName || 'Default Company'
    this.projectName = options.projectName || 'Default Project'
    this.reportType = options.reportType || 'all' // Default to generating all reports
    this.reportPath = options.reportPath || 'reports'
    this.traitsRegex = []
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
    const outputPath = this.reportPath || process.cwd()
    if (!fs.existsSync(outputPath)) {
      mkdirp.sync(outputPath)
    }
    const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm-ss')
    const reportFilename = `report-${timestamp}.xml`
    const reportPath = path.join(outputPath, reportFilename)
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
    const outputPath = this.reportPath || process.cwd()
    if (!fs.existsSync(outputPath)) {
      mkdirp.sync(outputPath)
    }
    const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm-ss')
    const reportFilename = `report-${timestamp}.txt`
    const reportPath = path.join(outputPath, reportFilename)
    fs.writeFileSync(reportPath, report)
    console.log('Text report written to ' + reportPath)
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
    const outputPath = this.reportPath || process.cwd()
    if (!fs.existsSync(outputPath)) {
      mkdirp.sync(outputPath)
    }
    const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm-ss')
    const reportFilename = `report-${timestamp}.json`
    const reportPath = path.join(outputPath, reportFilename)
    fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2))
    console.log('JSON report written to ' + reportPath)
  }

  onRunComplete(_contexts: any, results: any) {
    console.log('reportType: ' + this.reportType)
    if (this.stringIncludesAny(this.reportType, ['all', 'xml'])) {
      this.generateXmlReport(results)
    }

    if (this.stringIncludesAny(this.reportType, ['all', 'text'])) {
      this.generateTextReport(results)
    }
    if (this.stringIncludesAny(this.reportType, ['all', 'json'])) {
      this.generateJsonReport(results)
    }
  }

  stringIncludesAny(inputString: string, valuesToCheck: string[]): boolean {
    for (const value of valuesToCheck) {
      if (inputString.includes(value)) {
        return true // Found a match
      }
    }
    return false // No matches found
  }
}

export default customReporter
