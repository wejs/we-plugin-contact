/**
 * We.js contact plugin config
 */

module.exports = function loadPlugin(projectPath, Plugin) {
  var plugin = new Plugin(__dirname);

  // set plugin configs
  // plugin.setConfigs({

  // });
  // set plugin routes
  plugin.setRoutes({
    'get /api/v1/user/:userId/contact': {
      controller    : 'contact',
      action        : 'findOneUserContact',
      model         : 'contact',
      responseType  : 'json',
      permission    : true
    },
    // request
    'post /api/v1/user/:userId/contact-request': {
      controller    : 'contact',
      action        : 'requestContact',
      model         : 'contact',
      responseType  : 'json',
      permission    : true
    },
    // accept
    'post /api/v1/user/:userId/contact-accept': {
      controller    : 'contact',
      action        : 'acceptContact',
      model         : 'contact',
      responseType  : 'json',
      permission    : true
    },
    // ignore
    'post /api/v1/user/:userId/contact-ignore': {
      controller    : 'contact',
      action        : 'ignoreContact',
      model         : 'contact',
      responseType  : 'json',
      permission    : true
    },
    // delete contact relation
    'delete /api/v1/user/:userId/contact': {
      controller    : 'contact',
      action        : 'deleteContact',
      model         : 'contact',
      responseType  : 'json',
      permission    : true
    },

    'get /api/v1/contact/requests': {
      controller    : 'contact',
      action        : 'getContactRequests',
      model         : 'contact',
      responseType  : 'json',
      permission    : true
    },

    'get /api/v1/get-user-to-add': {
      controller    : 'contact',
      action        : 'getUsersToAdd',
      model         : 'user',
      responseType  : 'json',
      permission    : true
    },

    'get /contact': {
      controller    : 'contact',
      action        : 'getAllAuthenticatedUserContacts',
      model         : 'contact',
      responseType  : 'json',
      permission    : true
    }
  });

  plugin.events.on('socket.io:on:user:disconnect', function (data) {
    data.we.db.models.contact.findUserContacts(data.socket.user.id)
    .then(function (contacts) {
      contacts.forEach(function(c) {
        var cId = c.to;
        if (c.to == data.socket.user.id) cId = c.from;
        data.we.we.io.sockets.to('user_' + cId).emit('contact:disconnect', { id: data.socket.user.id });
      });
    });
  });

  return plugin;
};