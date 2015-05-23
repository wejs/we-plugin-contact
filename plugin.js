/**
 * We.js contact plugin config
 */

module.exports = function loadPlugin(projectPath, Plugin) {
  var plugin = new Plugin(__dirname);

  // set plugin configs
  // plugin.setConfigs({

  // });
  // ser plugin routes
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
    'get /contact': {
      controller    : 'contact',
      action        : 'getAllAuthenticatedUserContacts',
      model         : 'contact',
      responseType  : 'json',
      permission    : true
    }
  });

  return plugin;
};