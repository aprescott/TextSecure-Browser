var Whisper = Whisper || {};

(function () {
  'use strict';

  Whisper.MessageView = Backbone.View.extend({
    tagName:   "li",
    className: "entry",

    initialize: function() {
      this.$el.addClass(this.model.get('type'));

      this.template = $('#message').html();
      Mustache.parse(this.template);

      this.listenTo(this.model, 'change',  this.render); // auto update
      this.listenTo(this.model, 'destroy', this.remove); // auto update

    },

    render: function() {
      this.$el.html(
        Mustache.render(this.template, {
          message: this.model.get('body'),
          date: this.formatTimestamp(),
          attachments: this.model.get('attachments'),
          bubble_class: this.model.get('type') === 'outgoing' ? 'sent' : 'incoming'
        })
      );

      return this;
    },

    formatTimestamp: function() {
      var timestamp = this.model.get('timestamp');
      var now = new Date().getTime();
      var date = new Date();
      date.setTime(timestamp*1000);
      if (now - timestamp > 60*60*24*7) {
        return date.toLocaleDateString('en-US',{month: 'short', day: 'numeric'});
      }
      if (now - timestamp > 60*60*24) {
        return date.toLocaleDateString('en-US',{weekday: 'short'});
      }
      return date.toTimeString();
    }
  });

})();
