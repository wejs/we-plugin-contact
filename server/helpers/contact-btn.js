/**
 * We {{contact-btn}}  helper
 *
 * usage:  {{contact-btn userId=req.user.id contactUserId=currentUserId contact=contact locals=locals}}
 */

module.exports = function(we) {
  return function helper() {
    var options = arguments[arguments.length-1];
    var locals = options.hash.locals;

    // // helper attibutes is avaible at
    // // options.hash
    // // if call {{contact-btn  time="value"}} the value will be at options.hash.time

    if (
      !options.hash.userId ||
      options.hash.userId == options.hash.contactUserId
    ) {
      return '';
    }

    return we.view.renderTemplate('contact/contact-btn', locals.theme, {
      contact: options.hash.contact,
      redirectUrl: locals.req.url,
      contactUserId: options.hash.contactUserId
    });
  }
}