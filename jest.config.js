module.exports = {
  // The root directory where Jest should start searching for tests.
  // You can change this based on your project structure.
  roots: ['./'],

  // A list of file extensions to include when searching for test files.
  // Customize this based on the file extensions you use for your tests.
  testMatch: ['<rootDir>/__tests__/**/*.spec.ts'],

  // The test environment that Jest will use.
  // This example uses 'node', but you can choose a different environment if needed.
  testEnvironment: 'node',

  // An array of reporter names to use.
  // Include your custom reporter here, such as './path-to-custom-reporter.js'.
  reporters: [
    [
      './dist/custom-reporter.js',
      {
        companyName: 'Your Company',
        projectName: 'Your Project',
        reportType: ['text'], // Specify the desired report type here
        reportPath: './reports',
      },
    ],
  ],

  // The setupFiles property specifies a list of setup files to run before the tests.
  // You can use this to set up any global configurations or mocks.
  //setupFiles: ['./setupTests.ts'],

  // The transform property allows you to specify how to transform files before running tests.
  // Here, we're using 'ts-jest' to transform TypeScript files.
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // The moduleFileExtensions property lists the file extensions for modules.
  // Ensure that it includes '.ts' for TypeScript files.
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],

  // Any additional options or configurations can be added here.

  // Example coverage configuration:
  // coverageThreshold: {
  //   global: {
  //     branches: 80,
  //     functions: 80,
  //     lines: 80,
  //     statements: 80,
  //   },
  // },
}
