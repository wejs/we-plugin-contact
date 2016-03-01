/**
 * Widget contact-btn main file
 *
 * See https://github.com/wejs/we-core/blob/master/lib/class/Widget.js for all Widget prototype functions
 */

module.exports = function (projectPath, Widget) {
  var widget = new Widget('contact-btn', __dirname);

  // // Override default widget class functions after instance
  //
  // widget.beforeSave = function widgetBeforeSave(req, res, next) {
  //   // do something after save this widget in create or edit ...
  //   return next();
  // };

  // // form middleware, use for get data for widget form
  // widget.formMiddleware = function formMiddleware(req, res, next) {
  //
  //   next();
  // }

  // // Widget view middleware, use for get data after render the widget html
  widget.viewMiddleware = function viewMiddleware(widget, req, res, next) {

    if (
      !req.user ||
      !res.locals.user ||
      ( req.user.id == res.locals.user.id )
    ) {
      widget.disabled = true;
      return next();
    }

    req.we.db.models.contact
    .getUsersRelationship(req.user.id, res.locals.user.id, function (err, contact) {

      widget.contact = contact;

      console.log(err, contact);

      return next();
    });
  }

  return widget;
};