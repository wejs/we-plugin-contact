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
    var we = req.getWe();
    we.db.models.contact
    .getUsersRelationship (req.user.id, req.params.userId, function (err, contact){
      if (err) throw err;
      if (!contact) return res.send();
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

        if (created) {
          // if we-plugin-notification is avaible
          if (we.notification) {
            // register the notification
            we.db.models.notification.create({
              title: res.locals.__('contact.notification.request.title', {
                contact: contact,
                user: req.user,
                friend: contactUser
              }),
              text: res.locals.__('contact.notification.request.text', {
                contact: contact,
                user: req.user,
                friend: contactUser
              }),
              modelName: 'contact',
              link: '/user/'+contactUser.id,
              modelId: contact.id,
              userId: contactUser.id,
              locale: res.locals.locale,
              actions: [
                {
                  text: res.locals.__('contact.Accept'),
                  link: '/api/v1/user/'+req.user.id+'/contact-accept'
                },
                {
                  text: res.locals.__('contact.Ignore'),
                  link: '/api/v1/user/'+req.user.id+'/contact-ignore'
                }
              ]
            }).catch(function (err){
              we.log.error('Error on create contact notifications: ',err);
            });
          }

          if (we.io) {
            // emit to user
            we.io.sockets.in('user_' + contactUser.id).emit('contact:request', contact);
            // emit to other logged in user for sync status
            we.io.sockets.in('user_' + req.user.id).emit('contact:request', contact);
          }
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

        // if we-plugin-notification is avaible
        if (we.notification) {
          // get contact user and create the notification in async
          we.db.models.user.findById(contact.from)
          .then(function (contactUser){
            // register the notification
            we.db.models.notification.create({
              title: res.locals.__('contact.notification.accepted.title', {
                contact: contact,
                user: req.user,
                friend: contactUser
              }),
              text: res.locals.__('contact.notification.accepted.text', {
                contact: contact,
                user: req.user,
                friend: contactUser
              }),
              modelName: 'contact',
              link: '/user/' + contact.to,
              modelId: contact.id,
              userId: contact.from,
              locale: res.locals.locale
            }).catch(function (err){
              we.log.error('Error on create contact notifications: ',err);
            });
          }).catch(function (err){
            we.log.error('Error on load user for create contact notifications: ',err);
          });
        }

        if (we.io) {
          // emit to user
          we.io.sockets.in('user_' + contact.to).emit('contact:accept', contact);
          // emit to other logged in user for sync status
          we.io.sockets.in('user_' + contact.from).emit('contact:accept', contact);
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
        if (err) throw err;
        // emit to user
        we.io.sockets.in('user_' + contact.to).emit('contact:ignore', contact);
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
      if (err) throw err;
      if(!contact) return res.notFound();
      // if user is ignored return not found
      if(contact.status === 'ignored' && contact.from === req.user.id)
        return res.notFound();
      // delete the contact relationship
      we.db.models.contact.destroy({
        where: {id: contact.id}
      }).then(function (){
        // emit to user
        we.io.sockets.in('user_' + contact.to).emit('contact:delete', contact);
        // emit to other logged in user for sync status
        we.io.sockets.in('user_' + contact.from).emit('contact:delete', contact);
        // send 200 response
        return res.send();
      });
    });
  }
};
