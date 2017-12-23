/**
 * Contact controller
 */

module.exports = {
  /**
   * Get users to add as contact
   */
  getUsersToAdd(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();

    let sql = 'SELECT users.id, users.displayName, users.username FROM users '+
    ' LEFT JOIN contacts ON contacts.from = users.id OR contacts.to = users.id '+
    ' WHERE contacts.id IS NULL AND users.id != ? '+
    ' AND ( users.displayName LIKE ? OR users.email = ? ) '+
    ' LIMIT 25 ';

    console.log('>>>', [
      req.user.id,
      req.query.q+'%',
      req.query.q
    ]);

    req.we.db.defaultConnection
    .query(sql, {
      replacements: [
        req.user.id,
        req.query.q+'%',
        req.query.q
      ]
    })
    .spread( (record)=> {
      res.locals.data = record;
      return res.ok();
    })
    .catch(res.queryError);
  },

  getAllAuthenticatedUserContacts(req, res, next) {
    if (!req.isAuthenticated()) return res.forbidden();
    const we = req.we;

    if (req.query.status == 'requested') {
      return we.controllers.contact.getContactRequests(req, res, next);
    }

    we.db.models.contact
    .findUserContacts(req.user.id)
    .then( (result)=> {
      res.locals.metadata.count = result.length;
      let contactIds = [];

      if (result && result.length && we.io) {
        for (let i = result.length - 1; i >= 0; i--) {
          if (req.user.id == result[i].to) {
            result[i].dataValues.isOnline = we.io.isOnline(result[i].from);
            contactIds.push(result[i].from);
          } else {
            result[i].dataValues.isOnline = we.io.isOnline(result[i].to);
            contactIds.push(result[i].to);
          }
        }

        return we.db.models.user
        .findAll({
          where: {
            id: contactIds
          }
        })
        .then( (users)=> {
          res.locals.metadata.users = users;
          return res.ok(result);
        });
      } else {
        return res.ok(result);
      }
    })
    .catch(res.queryError);
  },

  getContactRequests(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();

    req.we.db.models.contact
    .findUserContactRequests(req.user.id)
    .then( (result)=> {
      res.locals.metadata.count = result.length;
      res.locals.data = result;
      return res.ok();
    })
    .catch(res.queryError);
  },

  /**
   * Find one user contact
   */
  findOneUserContact(req, res) {
    if(!req.isAuthenticated()) return res.forbidden();
    const we = req.we;

    we.db.models.contact
    .getUsersRelationship (req.user.id, req.params.userId, (err, contact)=> {
      if (err) return res.queryError(err);
      if (!contact) return res.send();
      return res.ok(contact);
    });
  },

  /**
   * Request contact relationship
   */
  requestContact(req, res) {
    if(!req.isAuthenticated()) return res.forbidden();
    const we = req.we;

    let uid = req.user.id;
    let contactId = req.params.userId;

    // check if user exists
    we.db.models.user
    .find({
      where: { id: contactId }
    })
    .then( (contactUser)=> {
      // contact not found or contactId is invalid
      if (!contactUser) return res.notFound();

      return we.db.models.contact
      .request({
        from: uid,
        to: contactId
      })
      .then( (r)=> {
        let contact = r[0];
        let created = r[1];

        if (created) {
          // if we-plugin-notification is avaible
          if (we.notification) {
            // register the notification
            we.db.models.notification
            .create({
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
            })
            .catch( (err)=> {
              we.log.error('Error on create contact notifications: ',err);
              return null;
            });
          }

          if (we.io && we.io.sockets) {
            // emit to user
            we.io.sockets.in('user_' + contactUser.id).emit('contact:request', contact);
            // emit to other logged in user for sync status
            we.io.sockets.in('user_' + req.user.id).emit('contact:request', contact);
          }
        }

        res.locals.data = contact;
        // send result
        return res.created();
      });
    })
    .catch(res.queryError);
  },

  /**
   * Accept a contact request, only the user in contact.to can accept the request
   *
   */
  acceptContact(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();
    const we = req.we;

    // first get and check if has one relationship
    we.db.models.contact
    .getUsersRelationship(req.user.id, req.params.userId, (err, contact)=> {
      if (err) return res.queryError(err);

      if (!contact) return res.notFound();
      // only logged in user can accept one contact
      if (contact.to != req.user.id ) return res.forbidden();

      // already accept
      if (contact.status == 'accepted') {
        return res.ok(contact);
      }

      contact.accept()
      .then( ()=> {

        // if we-plugin-notification is avaible
        if (we.notification) {
          // get contact user and create the notification in async
          we.db.models.user
          .findById(contact.from)
          .then( (contactUser)=> {
            // register the notification
            we.db.models.notification
            .create({
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
            })
            .catch( (err)=> {
              we.log.error('Error on create contact notifications: ',err);
              return null;
            });

            return null;
          })
          .catch( (err)=> {
            we.log.error('Error on load user for create contact notifications: ',err);
            return null;
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
      })
      .catch(res.queryError);
    });
  },

  ignoreContact(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();
    const we = req.we;
    // first get and check if has one relationship
    we.db.models.contact
    .getUsersRelationship(req.user.id, req.params.userId, (err, contact)=> {
      if (err) return res.queryError(err);
      if(!contact) return res.notFound();
      // only logged in user can accept one contact
      if(contact.to != req.user.id ) return res.forbidden();
      contact.ignore()
      .then(()=> {
        if (err) return res.queryError(err);
        // emit to user
        if (we.io && we.io.sockets) {
          we.io.sockets.in('user_' + contact.to).emit('contact:ignore', contact);
        }

        // send the response
        return res.send({contact: contact});
      });
    });
  },

  deleteContact(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();
    const we = req.we;
    // first get and check if has one relationship
    we.db.models.contact
    .getUsersRelationship(req.user.id, req.params.userId, (err, contact)=> {
      if (err) return res.queryError(err);
      if (!contact) return res.notFound();
      // if user is ignored return not found
      if (contact.status === 'ignored' && contact.from === req.user.id) {
        return res.notFound();
      }
      // delete the contact relationship
      we.db.models.contact
      .destroy({
        where: {id: contact.id}
      })
      .then( ()=> {
        if (we.io) {
          // emit to user
          we.io.sockets.in('user_' + contact.to).emit('contact:delete', contact);
          // emit to other logged in user for sync status
          we.io.sockets.in('user_' + contact.from).emit('contact:delete', contact);
        }

        // send 200 response
        return res.send();
      })
      .catch(res.queryError);
    });
  }
};
