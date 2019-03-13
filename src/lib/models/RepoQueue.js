import mongoose from 'mongoose';

let mongooseHidden = require('mongoose-hidden')();

const { Schema } = mongoose;

const repoQueueSchema = new Schema({
  fullName: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  }
});

// This will add `id` in toJSON
repoQueueSchema.set('toJSON', {
  virtuals: true
});

// This will remove `_id` and `__v`
repoQueueSchema.plugin(mongooseHidden);

export default mongoose.model('RepoQueue', repoQueueSchema);
