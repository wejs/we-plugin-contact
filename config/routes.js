/**
 * Routes
 *
 * Sails uses a number of different strategies to route requests.
 * Here they are top-to-bottom, in order of precedence.
 *
 * For more information on routes, check out:
 * http://sailsjs.org/#documentation
 */



/**
 * (1) Core middleware
 *
 * Middleware included with `app.use` is run first, before the router
 */


/**
 * (2) Static routes
 *
 * This object routes static URLs to handler functions--
 * In most cases, these functions are actions inside of your controllers.
 * For convenience, you can also connect routes directly to views or external URLs.
 *
 */

module.exports.routes = {

  // find contact relationship status
  'get /api/v1/user/:contactId/contact': {
    controller    : 'contact',
    action        : 'findOneUserContact'
  },
  // request
  'post /api/v1/user/:contactId/contact-request': {
    controller    : 'contact',
    action        : 'requestContact'
  },
  // accept
  'post /api/v1/user/:contactId/contact-accept': {
    controller    : 'contact',
    action        : 'acceptContact'
  },
  // ignore
  'post /api/v1/user/:contactId/contact-ignore': {
    controller    : 'contact',
    action        : 'ignoreContact'
  },
  // delete contact relation
  'delete /api/v1/user/:contactId/contact/': {
    controller    : 'contact',
    action        : 'deleteContact'
  },

  'get /contact': {
      controller    : 'ContactController',
      action        : 'getAllAuthenticatedUserContacts'
  }
}
