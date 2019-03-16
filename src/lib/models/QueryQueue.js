import mongoose from 'mongoose';

let mongooseHidden = require('mongoose-hidden')();

const { Schema } = mongoose;

const queryQueueSchema = new Schema({
  query: {
    type: String,
    required: true,
    unique: true
  },
  pages: {
    type: Number,
    default: 10
  },
  // either of user or repo
  type: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  }
});

// This will add `id` in toJSON
queryQueueSchema.set('toJSON', {
  virtuals: true
});

// This will remove `_id` and `__v`
queryQueueSchema.plugin(mongooseHidden);

export default mongoose.model('QueryQueue', queryQueueSchema);
