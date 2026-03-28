const puppeteer = require('puppeteer');

process.env.CHROME_BIN = puppeteer.executablePath();

module.exports = config => {
  config.set({
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox'],
      },
    },

    frameworks: ['mocha'],

    files: [
      { pattern: 'build/tests.bundle.js', watched: false },
    ],

    reporters: ['dots'],
  });
};
