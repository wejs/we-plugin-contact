var assert = require('assert');
var request = require('supertest');
var helpers = require('we-test-tools').helpers;
var http;
var we, async, _;
var agent;

describe('contactFeature', function() {
  var salvedUser, salvedUserPassword, authenticatedRequest, authToken;
  var salvedUser2, salvedUserPassword2, authenticatedRequest2, authToken2;

  before(function (done) {
    http = helpers.getHttp();
    agent = request.agent(http);

    we = helpers.getWe();

    _ = we.utils._;

    async = we.utils.async;

    we.config.acl.disabled = true;

    async.parallel([
      function connectUser(done){
        helpers.createAndLoginUser(function (err, result) {
          if (err) throw err;

          salvedUser = result.salvedUser;
          salvedUserPassword = result.salvedUserPassword;
          authenticatedRequest = result.authenticatedRequest;
          authToken = result.token;
          done();
        });
      },
      function connectUser2(done){
        helpers.createAndLoginUser(function (err, result) {
          if (err) throw err;

          salvedUser2 = result.salvedUser;
          salvedUserPassword2 = result.salvedUserPassword;
          authenticatedRequest2 = result.authenticatedRequest;
          authToken2 = result.token;
          done();
        });
      }
    ], done);
  });

  describe('HTTP', function() {
    afterEach(function(done){
      we.db.models.contact.destroy({where: {
        status: { id: {$not: null} }
      }}).then(function (){
        done();
      });
    });


    it ('get /api/v1/user/:userId/contact should return a empty request', function (done) {
      authenticatedRequest2.get('/api/v1/user/'+salvedUser.id+'/contact')
      .set('Accept', 'application/json')
      .expect(200)
      .end(function(err, res) {
        if (err) throw err;
        assert(!res.body.contact);
        done();
      });

    });
    it ('post /api/v1/user/:contactId/contact-request should request contact', function(done){
      authenticatedRequest.post('/api/v1/user/'+ salvedUser2.id +'/contact-request')
      .set('Accept', 'application/json')
      .expect(201)
      .end(function (err, res) {
        if (err) throw err;
        assert(res.body.contact);
        assert( _.isArray(res.body.contact) , 'contact not is array');
        assert(res.body.meta);
        assert(res.body.contact[0].id);
        assert.equal(res.body.contact[0].to, salvedUser2.id);
        assert.equal(res.body.contact[0].from, salvedUser.id);
        done();
      });
    });

    it ('post /api/v1/user/:userId/contact-accept should accept contact', function(done) {
      we.db.models.contact.request({
        from: salvedUser.id,
        to: salvedUser2.id
      }).then(function () {
        authenticatedRequest2.post('/api/v1/user/'+ salvedUser.id +'/contact-accept')
        .set('Accept', 'application/json')
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          assert(res.body.contact);
          assert( _.isArray(res.body.contact) , 'contact not is array');
          assert(res.body.meta);
          assert(res.body.contact[0].id);
          assert.equal(res.body.contact[0].to, salvedUser2.id);
          assert.equal(res.body.contact[0].from, salvedUser.id);
          done();
        });
      });
    });

    it ('delete /api/v1/user/:userId/contact/ should delete one contact request', function(done){
      we.db.models.contact.request({
        from: salvedUser.id,
        to: salvedUser2.id
      }).then(function () {
        authenticatedRequest2.delete('/api/v1/user/'+ salvedUser.id +'/contact')
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err) {
          if (err) throw err;
          done();
        });
      });
    });

    it ('post /api/v1/user/:userId/contact-ignore should ignore one contact request', function(done) {
      we.db.models.contact.request({
        from: salvedUser.id,
        to: salvedUser2.id
      }).then(function () {
        authenticatedRequest2.post('/api/v1/user/'+ salvedUser.id +'/contact-ignore')
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err) {
          if (err) throw err;
          done();
        });
      });
    });

    it ('get /contact should get all user contacts', function (done) {
      we.db.models.contact.request({
        from: salvedUser.id,
        to: salvedUser2.id
      }).then(function (r) {
        var contact = r[0];
        contact.accept().then(function () {
          authenticatedRequest2.get('/contact')
          .set('Accept', 'application/json')
          .expect(200)
          .end(function(err, res) {
            if (err) throw err;
            assert(res.body.contact);
            assert( res.body.contact.length >0 );
            assert(res.body.meta.count);
            done();
          });
        });
      });
    });

    it ('get /api/v1/user/:userId/contact should get one user contact relationship', function (done) {
      we.db.models.contact.request({
        from: salvedUser.id,
        to: salvedUser2.id
      }).then(function (r) {
        var contact = r[0];
        contact.accept().then(function () {
          authenticatedRequest2.get('/api/v1/user/'+salvedUser.id+'/contact')
          .set('Accept', 'application/json')
          .expect(200)
          .end(function(err, res) {
            if (err) throw err;
            assert(res.body.contact);
            assert( res.body.contact.length >0 );
            done();
          });
        });
      });
    });

  });
});