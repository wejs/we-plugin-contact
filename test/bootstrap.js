const projectPath = process.cwd(),
  path = require('path'),
  testTools = require('we-test-tools'),
  We = require('we-core');

let we;

before(function(callback) {
  this.slow(100);

  testTools.copyLocalConfigIfNotExitst(projectPath, function() {
    we = new We();
    testTools.init({}, we);

    we.bootstrap({
      // disable access log
      enableRequestLog: false,

      i18n: {
        directory: path.resolve(__dirname, '..', 'config/locales'),
        updateFiles: true,
        locales: ['en-us']
      },
      themes: {}
    }, (err)=>{
       if (err) return console.error(err);
       callback(err);
    });
  });
});

before(function(callback) {
  we.startServer(callback);
});

//after all tests
after(function (callback) {
  we.exit(callback);
});

after(function () {
  we.exit(process.exit);
});