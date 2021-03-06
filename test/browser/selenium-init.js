_ = require("jasmine-node");
var server = require("./../../src/server.js");
var webdriver = require('selenium-webdriver');

function start(withDriver) {
  if (process.env["TEST_LOC"] === "local") {
    console.log("Starting local server");
    server.start({
      baseUrl: process.env["BASE_URL"],
      port: process.env["PORT"],
      sessionSecret: process.env["SESSION_SECRET"],
      google: {
        clientId: process.env["GOOGLE_CLIENT_ID"],
        clientSecret: process.env["GOOGLE_CLIENT_SECRET"],
        redirect: "/oauth2callback"
      }
    }, function(app, server) {
      console.log("Server started, initializing selenium");
      var driver = new webdriver.Builder().
        withCapabilities({browserName: "chrome"}).
        build();
      withDriver(server, process.env["BASE_URL"], driver);
    });
  }
  else {
    var driver = new webdriver.Builder().
      usingServer("https://ondemand.saucelabs.com/wd/hub").
      withCapabilities({
        browserName: "internet explorer",
        username: process.env["SAUCE_USERNAME"],
        accessKey: process.env["SAUCE_ACCESS_KEY"]
      }).
      build();
    withDriver(null, process.env["SAUCE_TEST_TARGET"], driver);
  }
}

var googleUsername = process.env["SELENIUM_GOOGLE_USER"];
var googlePassword = process.env["SELENIUM_GOOGLE_PASSWORD"];

function googleLogin(driver) {
  driver.wait(function() {
    return driver.getTitle().then(function(title) {
      return title === 'Sign in - Google Accounts';
    });
  }, 3000);
  // Sometimes email isn't present because the browser remembers which
  // Google account we last logged in as
  driver.findElement(webdriver.By.id("Email")).getAttribute("class").then(function(cls) {
    if(cls.indexOf("hidden") === -1) {
      driver.findElement(webdriver.By.id("Email")).sendKeys(googleUsername);
    }
    driver.findElement(webdriver.By.id("Passwd")).sendKeys(googlePassword);
    driver.findElement(webdriver.By.id("signIn")).click();
  });
}
function googleLogout(driver) {
  driver.get("https://accounts.google.com/Logout");
}
function waitThenClick(driver, query) {
  driver.wait(function() {
    return driver.isElementPresent(query);
  }, 4000);
  return driver.findElement(query).click();
}
function contains(str) {
  return webdriver.By.xpath("//*[contains(text(), '" + str + "')]")
}

function setupExceptions(test, done) {
  webdriver.promise.controlFlow().on('uncaughtException', function(e) {
    console.error('Unhandled error: ' + e);
    test.fail(new Error("Unhandled exception: " + e));
    done();
  });
}

function webbit(description, runner, timeout) {
  it(description, function(done) {
    setupExceptions(this, done);
    runner(done);
  }, timeout);
}

function waitForPyretLoad(driver, timeout) {
  return driver.wait(function() {
    console.log("Waiting for loader to disappear...");
    return driver.findElement(webdriver.By.id("loader")).getCssValue("display")
    .then(function(d) {
      console.log("style: ", d);
      return d === "none";
    });
  }, timeout || 3000);
}


module.exports = {
  webbit: webbit,
  googleLogout: googleLogout,
  googleLogin: googleLogin,
  contains: contains,
  waitThenClick: waitThenClick,
  waitForPyretLoad: waitForPyretLoad,
  start: start
};
