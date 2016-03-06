/**
 * Contact controller
 *
 */

module.exports = {
  /**
   * Get users to add as contact
   */
  getUsersToAdd: function(req, res) {
    if(!req.isAuthenticated()) return res.forbidden();

    var sql = 'SELECT users.id, users.displayName, users.username FROM users '+
    ' LEFT JOIN contacts ON contacts.from = users.id OR contacts.to = users.id '+
    ' WHERE contacts.id IS NULL AND users.id != ? '+
    ' AND ( users.displayName LIKE ? OR users.email = ? ) '+
    ' LIMIT 25 ';

    req.we.db.defaultConnection.query(sql, {
      replacements: [req.user.id, req.query.q+'%', req.query.q]
    }).spread(function (record) {
      res.locals.data = record;
      return res.ok();
    }).catch(res.queryError);
  },

  find: function findUserContacts (req, res) {
    var we = req.we;

    we.db.models.contact
    .findUserContacts(req.params.userId, req.query.status)
    .then(function (result){
      res.locals.metadata.count = result.length;
      var contactIds = [];

      if (result && result.length && we.io) {
        for (var i = result.length - 1; i >= 0; i--) {
          if (req.user.id == result[i].to) {
            result[i].dataValues.isOnline = we.io.isOnline(result[i].from);
            contactIds.push(result[i].from);
          } else {
            result[i].dataValues.isOnline = we.io.isOnline(result[i].to);
            contactIds.push(result[i].to);
          }
        }

        we.db.models.user.findAll({
          where: {
            id: contactIds
          }
        }).then(function (users) {
          res.locals.metadata.users = users;
          res.ok(result);
        });
      } else {
        res.ok(result);
      }
    }).catch(res.queryError);
  },

  getAllAuthenticatedUserContacts: function(req, res, next) {
    if(!req.isAuthenticated()) return res.forbidden();
    var we = req.we;

    if (req.query.status == 'requested') {
      return we.controllers.contact.getContactRequests(req, res, next);
    }

    we.db.models.contact.findUserContacts(req.user.id)
    .then(function (result){
      res.locals.metadata.count = result.length;
      var contactIds = [];

      if (result && result.length && we.io) {
        for (var i = result.length - 1; i >= 0; i--) {
          if (req.user.id == result[i].to) {
            result[i].dataValues.isOnline = we.io.isOnline(result[i].from);
            contactIds.push(result[i].from);
          } else {
            result[i].dataValues.isOnline = we.io.isOnline(result[i].to);
            contactIds.push(result[i].to);
          }
        }

        we.db.models.user.findAll({
          where: {
            id: contactIds
          }
        }).then(function (users) {
          res.locals.metadata.users = users;
          res.ok(result);
        });
      } else {
        res.ok(result);
      }
    }).catch(res.queryError);
  },

  getContactRequests: function(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();

    req.we.db.models.contact.findUserContactRequests(req.user.id)
    .then(function (result){
      res.locals.metadata.count = result.length;
      res.locals.data = result;
      res.ok();
    }).catch(res.queryError);
  },

  /**
   * Find one user contact
   */
  findOneUserContact: function findOneUserContact(req, res) {
    if(!req.isAuthenticated()) return res.forbidden();

    var we = req.we;
    we.db.models.contact
    .getUsersRelationship (req.user.id, req.params.userId, function (err, contact) {
      if (err) throw err;
      if (!contact) return res.send();

      contact.btnText = res.locals.__(
        'contact-btn-text-'+ ( contact.status || 'add' )
      );

      return res.ok(contact);
    });
  },

  /**
   * Request contact relationship
   */
  requestContact: function requestContact (req, res) {
    if(!req.isAuthenticated()) return res.forbidden();
    var we = req.we;

    var uid = req.user.id;
    var contactId = req.params.userId;

    // check if user exists
    we.db.models.user.find({
      where: { id: contactId }
    }).then(function (contactUser) {
      // contact not found or contactId is invalid
      if (!contactUser) return res.notFound();

      we.db.models.contact.request({
        from: uid,
        to: contactId
      }).then(function (r) {
        var contact = r[0];
        var created = r[1];

        contact.btnText = res.locals.__(
          'contact-btn-text-requestsToYou'
        );
        contact.btnRequesterText = res.locals.__(
          'contact-btn-text-requested'
        );

        if (created) {
          // if we-plugin-notification is avaible
          if (we.plugins['we-plugin-notification'] && req.isAuthenticated()) {

            var hostname = we.config.hostname;

            // after create register one notifications
            we.db.models.notification.create({
              locale: res.locals.locale,
              title: res.locals.__('contact.notification.request.title', {
                acceptUrl: hostname+'/api/v1/user/'+req.user.id+'/contact-accept',
                ignoreUrl: hostname+'/api/v1/user/'+req.user.id+'/contact-ignore',
                hostname: hostname,
                requester: req.user,
                contact: contact
              }),
              redirectUrl: hostname+'/user/'+contactId,
              userId: contactId,
              actorId: req.user.id,
              modelName: 'user',
              modelId: contactId,
              type: 'contact-request'
            }).then(function (r) {
              // res.locals.createdPostUserNotified[follower.userId] = true;
              we.log.verbose('New contact notification, id: ', r.id);
            }).catch(function (err) {
              we.log.error('we-plugin-contact: ', err);
            });
          }

          if (we.io) {
            // emit to user
            we.io.sockets.in('user_' + contactUser.id).emit('contact:request', contact);
            // emit to requester logged in user for sync status
            we.io.sockets.in('user_' + req.user.id).emit('contact:requested', contact);
          }
        }

        if (res.locals.redirectTo) {
          return res.goTo(res.locals.redirectTo);
        } else if (res.locals.responseType == 'html') {
          return res.goTo('/user/'+req.params.userId);
        }

        res.locals.data = contact;
        // send result
        res.created();
      });
    });
  },

  /**
   * Accept a contact request, only the user in contact.to can accept the request
   *
   */
  acceptContact: function acceptContact (req, res) {
    if(!req.isAuthenticated()) return res.forbidden();
    var we = req.we;

    // first get and check if has one relationship
    we.db.models.contact
    .getUsersRelationship(req.user.id, req.params.userId, function (err, contact) {
      if (err) throw err;

      if(!contact) return res.notFound();
      // only logged in user can accept one contact
      if(contact.to != req.user.id ) return res.forbidden();

      // already accept
      if (contact.status == 'accepted') {
        return res.ok(contact);
      }

      contact.accept().then(function () {
        contact.btnText = res.locals.__(
          'contact-btn-text-'+ ( contact.status || 'add' )
        );

        // if we-plugin-notification is avaible
        if (we.plugins['we-plugin-notification'] && req.isAuthenticated()) {

          var hostname = we.config.hostname;
          // get contact user and create the notification in async
          we.db.models.user.findById(contact.from)
          .then(function (contactUser){
            // after create register one notifications
            we.db.models.notification.create({
              locale: res.locals.locale,
              title: res.locals.__('contact.notification.accepted.title', {
                hostname: hostname,
                requested: req.user,
                requester: contactUser
              }),
              redirectUrl: hostname+'/user/'+contact.to,
              userId: contact.from,
              actorId: req.user.id,
              modelName: 'user',
              modelId: contact.to,
              type: 'contact-accept'
            }).then(function (r) {
              we.log.verbose('New contact notification, id: ', r.id);
            }).catch(function (err) {
              we.log.error('we-plugin-contact: ', err);
            });
          }).catch(function (err) {
            we.log.error('Error on load user for create contact notifications: ',err);
          });

          req.we.db.models.notification.update({
            read: true
          }, {
            where: {
              actorId: contact.from,
              modelId: req.user.id,
              modelName: 'user',
              userId: req.user.id,
              type: 'contact-request'
            }
          }).catch(function (err) {
            req.we.log.error(err);
          });
        }

        if (we.io) {
          // emit to user
          we.io.sockets.in('user_' + contact.to).emit('contact:accept', contact);
          // emit to other logged in user for sync status
          we.io.sockets.in('user_' + contact.from).emit('contact:accept', contact);
        }

        if (res.locals.redirectTo) {
          return res.goTo(res.locals.redirectTo);
        } else if (res.locals.responseType == 'html') {
          // redirect to contat if are an html request
          return res.goTo('/user/'+contact.from);
        }

        // send the response
        return res.ok(contact);
      });
    });
  },

  ignoreContact: function ignoreContact (req, res) {
    if (!req.isAuthenticated()) return res.forbidden();
    var we = req.getWe();
    // first get and check if has one relationship
    we.db.models.contact
    .getUsersRelationship(req.user.id, req.params.userId, function (err, contact){
      if (err) throw err;
      if(!contact) return res.notFound();
      // only logged in user can accept one contact
      if(contact.to != req.user.id ) return res.forbidden();
      contact.ignore().then(function () {
        if (err) return res.queryError(err);

        contact.btnText = res.locals.__(
          'contact-btn-text-'+ ( contact.status || 'add' )
        );

        // emit to user
        we.io.sockets.in('user_' + contact.to).emit('contact:ignore', contact);

        if (res.locals.redirectTo) {
          return res.goTo(res.locals.redirectTo);
        } else if (res.locals.responseType == 'html') {
          // redirect to contat if are an html request
          return res.goTo('/user/'+req.params.userId);
        }

        // send the response
        return res.send({contact: contact});
      });
    });
  },

  deleteContact: function deleteContact (req, res) {
    if(!req.isAuthenticated()) return res.forbidden();
    var we = req.getWe();
    // first get and check if has one relationship
    we.db.models.contact
    .getUsersRelationship(req.user.id, req.params.userId, function (err, contact) {
      if (err) return res.queryError(err);
      if(!contact) return res.notFound();
      // if user is ignored return not found
      if(contact.status === 'ignored' && contact.from === req.user.id)
        return res.notFound();
      // delete the contact relationship
      we.db.models.contact.destroy({
        where: {id: contact.id}
      }).then(function () {
        contact.status = 'deleted';
        contact.btnText = res.locals.__(
          'contact-btn-text-add'
        );

        res.locals.data = contact;

        // emit to user
        we.io.sockets.in('user_' + contact.to).emit('contact:delete', contact);
        // emit to other logged in user for sync status
        we.io.sockets.in('user_' + contact.from).emit('contact:delete', contact);

        if (res.locals.redirectTo) {
          return res.goTo(res.locals.redirectTo);
        } else if (res.locals.responseType == 'html') {
          // redirect to contat if are an html request
          return res.goTo('/user/'+req.params.userId);
        }

        // send 200 response
        return res.ok();
      });
    });
  }
};
