/**
 * Contact controller
 *
 */
module.exports = {
  getAllAuthenticatedUserContacts: function(req, res) {
    if(!req.isAuthenticated()) return res.forbidden();
    var we = req.getWe();

    we.db.models.contact.findAndCountAll({
      where: {
        $or: [
          {
            from: req.user.id
          },
          {
            to: req.user.id
          }
        ],
        status: 'accepted'
      }
    }).then(function(result){
      res.locals.metadata.count = result.count;
      res.ok(result.rows);
    });
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
    if(!req.isAuthenticated()) return res.forbiden();
    var we = req.getWe();

    var uid = req.user.id;
    var contactId = req.params.userId;

    // check if user exists
    we.db.models.user.find({
      where: {
        id: contactId
      }
    }).then(function (contactUser) {
      // contact not found or contactId is invalid
      if (!contactUser) return res.notFound();

        we.db.models.contact.request({
          from: uid,
          to: contactId
        }).then(function (r) {
          var contact = r[0];
          // emit to user
          we.io.sockets.in('user_' + contact.to).emit('contact:request', contact);
          // emit to other logged in user for sync status
          we.io.sockets.in('user_' + contact.from).emit('contact:request', contact);

          res.locals.record = contact;
          // send result
          res.created();
        });

    });
  },

  acceptContact: function acceptContact (req, res) {
    if(!req.isAuthenticated()) return res.forbiden();
    var we = req.getWe();

    // first get and check if has one relationship
    we.db.models.contact
    .getUsersRelationship(req.user.id, req.params.userId, function (err, contact) {
      if (err) throw err;

      if(!contact) return res.notFound();
      // only logged in user can accept one contact
      if(contact.to != req.user.id ) return res.forbiden();

      contact.accept().then(function () {
        // emit to user
        we.io.sockets.in('user_' + contact.to).emit('contact:accept', contact);
        // emit to other logged in user for sync status
        we.io.sockets.in('user_' + contact.from).emit('contact:accept', contact);
        // send the response
        return res.ok(contact);
      });
    });
  },

  ignoreContact: function ignoreContact (req, res) {
    if (!req.isAuthenticated()) return res.forbiden();
    var we = req.getWe();
    // first get and check if has one relationship
    we.db.models.contact
    .getUsersRelationship(req.user.id, req.params.userId, function (err, contact){
      if (err) throw err;
      if(!contact) return res.notFound();
      // only logged in user can accept one contact
      if(contact.to != req.user.id ) return res.forbiden();
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
    if(!req.isAuthenticated()) return res.forbiden();
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
