const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create Schema
const TagSchema = new Schema({

  label: {
    type: String,
    required: true,
    max: 30
  },

  color: {
    type: String,
    default: '#FF5E3C'
  }


});

module.exports = Tag = mongoose.model('tag', TagSchema);
