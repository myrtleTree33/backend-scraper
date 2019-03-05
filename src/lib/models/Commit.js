import mongoose from 'mongoose';

let mongooseHidden = require('mongoose-hidden')();

const { Schema } = mongoose;

const commitSchema = new Schema({
  userId: {
    required: true,
    type: String
  },
  date: {
    required: true,
    type: Date
  },
  count: {
    required: true,
    type: Number,
    default: 0
  }
});

// make key unique, based on userId and date
commitSchema.index({ userId: 1, date: 1 }, { unique: true });

// This will add `id` in toJSON
commitSchema.set('toJSON', {
  virtuals: true
});

// This will remove `_id` and `__v`
commitSchema.plugin(mongooseHidden);

export default mongoose.model('Commit', commitSchema);
