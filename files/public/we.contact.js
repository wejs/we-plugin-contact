/**
 * Client site contact API
 *
 * This api has suport to socke.io and ajax requests with webcomponents
 */

window.addEventListener('WebComponentsReady', function() {

  var WeContactPrototype = Object.create(HTMLElement.prototype);

  WeContactPrototype.createdCallback = function() {
    this.style.display = 'none';

    this.getContactStatus();

    this.addEventListener('click', function () {
      if (!this.dataset.status) this.dataset.status = 'add';

      switch(this.dataset.status) {
        case 'add':
        case 'deleted':
          this.addContact();
          break;
        case 'accepted':
          this.removeContact();
          break;
        case 'requestsToYou':
          this.acceptContact();
          break;
      }
    }, false);

    if (window.we.socket) {
      this.setSocketIOEvents();
    }
  };

  WeContactPrototype.getContactStatus = function() {
    if (!this.dataset.contactuserid) return;

    var self = this;

    $.ajax({
      headers: { accept: 'application/json' },
      url: '/api/v1/user/'+this.dataset.contactuserid+'/contact'
    }).then(function (r) {

      if (r.contact) {
        self.innerHTML = r.contact.btnText;
        self.dataset.status = r.contact.status;

        if (r.contact.status == 'requested') {
          self.setAttribute('disabled', 'disabled');
        }
      }

      self.style.display = null;
    });
  };

  WeContactPrototype.addContact = function() {
    var self = this;

    $.ajax({
      headers: { accept: 'application/json' },
      method: 'post',
      url: '/api/v1/user/'+this.dataset.contactuserid+'/contact-request'
    }).then(function (r) {
      if (r.contact) {
        self.changeStatusToRequested(r.contact);
      }

      self.style.display = null;
    });
  };

  WeContactPrototype.acceptContact = function() {
    var self = this;

    $.ajax({
      headers: { accept: 'application/json' },
      url: '/api/v1/user/'+this.dataset.contactuserid+'/contact-accept'
    }).then(function (r) {
      if (r && r.contact) {
        self.changeStatus(r.contact);
      }

      self.style.display = null;
    });
  };

  WeContactPrototype.ignoreContact = function() {
    console.log('TODO: ignoreContact() called');
  };

  /**
   * On click in button and for send the remove contact
   */
  WeContactPrototype.removeContact = function() {
    var self = this;

    $.ajax({
      headers: { accept: 'application/json' },
      method: 'post',
      url: '/api/v1/user/'+this.dataset.contactuserid+'/contact-delete'
    }).then(function (r) {
      if (r.contact) {
        self.changeStatus(r.contact, 'add');
      }

      self.style.display = null;
    });
  };

  WeContactPrototype.setSocketIOEvents = function() {
    var self = this;
    var socket = window.we.socket;

    socket.on('contact:accept', function (contact) {
      self.changeStatus(contact);
    });

    socket.on('contact:delete', function (contact) {
      self.changeStatus(contact);
    });

    socket.on('contact:request', function (contact) {
      self.changeStatus(contact, 'requestsToYou');
    });

    socket.on('contact:requested', function (contact) {
      self.changeStatusToRequested(contact);
    });
  };

  WeContactPrototype.changeStatus = function (contact, status) {
    this.innerHTML = contact.btnText;
    this.dataset.status = ( status || contact.status );
    this.removeAttribute('disabled');
  };

  WeContactPrototype.changeStatusToRequested = function (contact) {
    this.innerHTML = contact.btnRequesterText;
    this.dataset.status = 'requested';
    this.setAttribute('disabled', 'disabled');
  };

  document.registerElement('we-contact-btn', {
    prototype: WeContactPrototype
  });
});