var Whisper = Whisper || {};

(function () {
  'use strict';

  Whisper.ConversationView = Backbone.View.extend({
    className: 'conversation',
    initialize: function() {
      this.listenTo(this.model, 'destroy', this.stopListening); // auto update
      this.template = $('#conversation').html();
      Mustache.parse(this.template);
      this.$el.html(Mustache.render(this.template));

      this.view = new Whisper.MessageListView({collection: this.model.messages()});
      this.model.messages().fetch({reset: true});
      this.$el.find('.discussion-container').append(this.view.el);
      window.addEventListener('storage', (function(){
        this.fetch();
      }).bind(this));
    },
    events: {
      'submit .send': 'sendMessage',
      'close': 'remove'
    },

    fetch: function() {
      this.model.messages().fetch({reset: true});
    },

    sendMessage: function(e) {
      e.preventDefault();
      var input = this.$el.find('.send input');
      if (input.val().length > 0) {
        this.model.sendMessage(input.val());
        input.val("");
      }
    },

    render: function() {
      Whisper.Layout.setContent(this.$el.show());
      return this;
    }
  });
})();
