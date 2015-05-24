/**
 * Contact model
 */

module.exports = function Model(we) {
  var model = {
    definition: {
      // user how send the request
      from: {
        type: we.db.Sequelize.BIGINT,
        allowNull: false
      },
      to: {
        type: we.db.Sequelize.BIGINT,
        allowNull: false
      },
      // requested | accepted| ignored
      // requestsToYou
      status: {
        type: we.db.Sequelize.ENUM('requested', 'accepted', 'ignored'),
        defaultValue: 'requested'
      }
    },

    options: {
      instanceMethods: {
        accept: function acceptContact() {
          // set new status
          this.status = 'accepted';
          return this.save();
        },
        ignore: function ignoreContact() {
          // set new status
          this.status = 'ignored';
          return this.save();
        }
      },

      classMethods: {
        findUserContacts: function findUserContacts(userId) {
          return we.db.models.contact.findAll({
            where: {
              $or: [
                {
                  from: userId
                },
                {
                  to: userId
                }
              ],
              status: 'accepted'
            }
          });
        },
        /**
         * Request contact relationship
         *
         * @param  {object} ops options { from: '', to, '' }
         * @return {object}     Sequelzie findOrCreateInstance
         */
        request: function requestContact(ops) {
          return we.db.models.contact.findOrCreate({
            where: {
              $or: [{
                from: ops.from,
                to: ops.to
              },{
                from: ops.from,
                to: ops.to
              }]
            },
            defaults: {
              from: ops.from,
              to: ops.to
            }
          });
        },
        /**
         * Get user contact relationship
         * @param  {string}   uid      user id to get contacts use for logged in user
         * @param  {string}   contact_id      contact id
         * @param  {function} callback  after done exec with callback(error,contact)
         */
        getUsersRelationship: function getUsersRelationship(uid, contactId, callback) {
          we.db.models.contact.find({
            where: {
              $or: [{
                from: uid,
                to: contactId
              },{
                from: contactId,
                to: uid
              }]
            }
          }).then(function (contact) {
            // no relationship found
            if(!contact) return callback();
            // if request is to user uid
            if (contact.status === 'requested' && contact.to === uid){
              contact.status = 'requestsToYou';
            }
            callback(null, contact);
          }).catch(callback);
        },

        /**
         * Get user contacts with user id
         * @param  {string}   uid      user id to get contacts
         * @param  {function} callback  after done exec with callback(error,contacts)
         */
        getUserContacts: function getUserContacts(uid, callback){
          we.db.models.contact.findAll({
            where: {
              $or: [{
                from: uid,
              },{
                to: uid
              }]
            }
          })
          .then(function(contacts) {
            callback(contacts);
          }).catch(callback);
        }
      }
    }
  }
  return model;
}




// module.exports = {
//   schema: true,
//   attributes: {

//     // user how send the request
//     from: {
//       type: 'string',
//       required: true
//     },

//     to: {
//       type: 'string',
//       required: true
//     },

//     // requested | accepted| ignored
//     // requestsToYou
//     status: {
//       type: 'string',
//       defaultsTo: 'requested',
//       'in': ['requested', 'accepted', 'ignored']
//     }
//   },

//   // Lifecycle Callbacks
//   beforeCreate: function(record, next) {
//     // on create status will be requested
//     record.status = 'requested';
//     next();
//   },

//   // beforeUpdate: function(record, next) {
//   // },


// };
