var assert = require('assert');
var request = require('supertest');
var helpers = require('we-test-tools').helpers;
var stubs = require('we-test-tools').stubs;
var http, _, we;

describe('contactFeature', function () {
  var salvedUser, salvedUserPassword;
  var authenticatedRequest;

  before(function (done) {
    http = helpers.getHttp();
    we = helpers.getWe();

    _ = we.utils._;

    var userStub = stubs.userStub();
    helpers.createUser(userStub, function(err, user) {
      if (err) throw err;

      salvedUser = user;
      salvedUserPassword = userStub.password;

      // login user and save the browser
      authenticatedRequest = request.agent(http);
      authenticatedRequest.post('/login')
      .set('Accept', 'application/json')
      .send({
        email: salvedUser.email,
        password: salvedUserPassword
      })
      .expect(200)
      .set('Accept', 'application/json')
      .end(function (err) {
        if (err) throw err;

        done();
      });

    });
  });

  describe('find', function () {
    it('get /contact route should find one contact', function(done){
      request(http)
      .get('/contact')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        assert.equal(200, res.status);
        assert(res.body.contact);
        assert( _.isArray(res.body.contact) , 'contact not is array');
        assert(res.body.meta);

        done();
      });
    });
  });
  describe('create', function () {
    it('post /contact create one contact record');
  });
  describe('findOne', function () {
    it('get /contact/:id should return one contact');
  });
  describe('update', function () {
    it('put /contact/:id should upate and return contact');
  });
  describe('destroy', function () {
    it('delete /contact/:id should delete one contact')
  });
});
