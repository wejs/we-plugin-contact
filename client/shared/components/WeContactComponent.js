App.inject( 'component:we-contact-button', 'store', 'store:main' );

App.WeContactButtonComponent = Ember.Component.extend({
  layout: Ember.Handlebars.compile('{{{icon}}} {{view.label}}'),
  tagName: 'button',
  classNames: ['btn','btn-xs','btn-default'],

  contact: null,
  user: null,
  isVisible: false,

  icon: '<span class="glyphicon glyphicon-plus"></span>',

  init: function() {
    this._super();
    var self = this;

    Ember.$.ajax({
      type: 'GET',
      url: '/api/v1/user/'+ self.get('user.id') +'/contact',
      dataType: 'json',
      contentType: 'application/json'
    }).done(function(data){
      if(data.contact) {
        delete data.meta;
        self.get('store').pushPayload(data);
        self.set('contact', self.get('store').getById('contact',data.contact[0].id));
      }
    }).always(function() {
      self.set('isVisible', true);
    })
  },

  label: function() {
    switch(this.get('contact.currentUserStatus')){
      case 'requested':
        return Ember.I18n.t('contact.button.requested');
      case 'requestsToYou':
        return Ember.I18n.t('contact.button.requestsToYou');
      case 'accepted':
        return Ember.I18n.t('contact.button.accepted');
      case 'ignored':
      case 'currentUser':
        return '';
      default:
        return Ember.I18n.t('contact.button.add');
    }
  }.property('contact.currentUserStatus'),
  disabled: function(){
    switch(this.get('contact.currentUserStatus')){
      // case 'requestsToYou':
      // case 'accepted':
      //   return null;
      case 'requested':
      case 'ignored':
      case 'currentUser':
        return 'disabled';
      default:
        return null;
    }

  }.property('contact.currentUserStatus'),
  attributeBindings: ['contact','disabled'],
  click: function() {
    switch(this.get('contact.currentUserStatus')){
      case 'requested':
        // TODO!
        this.send('cancelContactRequest');
        break;
      case 'requestsToYou':
        this.send('acceptAddInContactList');
        break;
      case 'accepted':
        this.send('deleteContact');
        break;
      case 'ignored':
        this.send('deleteContact');
        break;
      default:
        this.send('requestAddInContactList');
    }
  },

  isThisContact: function(contact) {
    if (contact.to == this.get('user.id') || contact.from == this.get('user.id')) {
      return true;
    }
    return false;
  },

  getContactIdFromData: function(contact) {
    if (App.get('currentUser.id') === contact.to) {
      return contact.from
    } else {
      return contact.to
    }
  },

  onReceiveRequest: function(contact) {
    this.isThisContact(contact);
    this.get('store').pushPayload({contact: contact});
    this.set('contact', this.get('store').getById('contact', contact.id));
  },
  onAcceptRequest: function(contact) {
    this.isThisContact(contact);
    var self = this;
    this.set('contact.status', contact.status);
    this.set('contact.updatedAt', contact.updatedAt);

    window.FollowObject.follow(
      'user',
      this.getContactIdFromData(contact),
      self.get('store')
    ).then(function(){});
  },
  onIgnoreRequest: function(contact) {
    this.isThisContact(contact);
    // TODO ignore contact
  },
  onDeletAccept: function(contact) {
    this.isThisContact(contact);
    this.set('contact', null);
  },
  setEvents: function(socket) {
    socket.on('contact:request', this.onReceiveRequest.bind(this));
    socket.on('contact:accept', this.onAcceptRequest.bind(this));
    socket.on('contact:ignore', this.onIgnoreRequest.bind(this));
    socket.on('contact:delete', this.onDeletAccept.bind(this));
  },
  didInsertElement: function() {
    this.setEvents(App.socket);
  },
  willDestroyElement: function() {
    App.socket.removeListener(this.onReceiveRequest);
  },

  actions: {
    requestAddInContactList: function(){
      var self = this;
      Ember.$.post('/api/v1/user/'+this.get('user.id')+'/contact-request')
      .done(function() {
        window.FollowObject.follow(
          'user',
          self.get('user.id'),
          self.get('store')
        ).then(function(){});
      })
      .fail(function(data) {
         Ember.Logger.error('Error on requestAddInContactList contact:',data.contact);
      });

    },
    acceptAddInContactList: function(){
      Ember.$.post('/api/v1/user/'+this.get('user.id')+'/contact-accept')
      .done(function() {})
      .fail(function(data) {
         Ember.Logger.error('Error on acceptAddInContactList contact:',data);
      });
    },

    ignoreContact: function(){
      var self = this;

      Ember.$.post('/api/v1/user/'+this.get('user.id')+'/contact-ignore')
      .done(function(data) {
        self.set('contact.status',data.contact.status);
      })
      .fail(function(data) {
         Ember.Logger.error('Error on ignoreContact contact:',data);
      });

    },
    deleteContact: function(){
      if(confirm('Tem certeza que deseja canselar a amizade com o '+
        this.get('user.displayName') + ' ?')
      ){
        Ember.$.ajax({
          url: '/api/v1/user/'+this.get('user.id')+'/contact',
          type: 'DELETE'
        })
        .done(function(data) {
          console.warn('ignoreContact',data.contact);
        })
        .fail(function(data) {
           Ember.Logger.error('Error on deleteContact:',data);
        });
      }

    }
  }
});