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
      permission    : true
    },
    // accept
    'get /api/v1/user/:userId/contact-accept': {
      controller    : 'contact',
      action        : 'acceptContact',
      model         : 'contact',
      permission    : true
    },
    // ignore
    'get /api/v1/user/:userId/contact-ignore': {
      controller    : 'contact',
      action        : 'ignoreContact',
      model         : 'contact',
      permission    : true
    },

    // delete contact relation
    'post /api/v1/user/:userId/contact-delete': {
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

    'get /user/:userId/contact': {
      name          : 'contact_find',
      controller    : 'contact',
      action        : 'find',
      model         : 'contact',
      permission    : 'find_contact'
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

  plugin.addJs('we.contact', {
    weight: 15, pluginName: 'we-plugin-contact',
    path: 'files/public/we.contact.js'
  });

  return plugin;
};