const projectPath = process.cwd(),
  deleteDir = require('rimraf'),
  path = require('path'),
  async = require('async'),
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
  const tempFolders = [
    projectPath + '/files/tmp',
    projectPath + '/files/config',
    projectPath + '/files/sqlite',

    projectPath + '/files/public/min',

    projectPath + '/files/public/tpls.hbs.js',
    projectPath + '/files/public/admin.tpls.hbs.js',
    projectPath + '/files/public/project.css',
    projectPath + '/files/public/project.js',
    projectPath + '/config/local.js',
  ];

  async.each(tempFolders, (folder, next)=> {
    deleteDir( folder, next);
  }, (err)=> {
    if (err) throw new Error(err);
    callback();
  });
});

after(function () {
  we.exit(process.exit);
});