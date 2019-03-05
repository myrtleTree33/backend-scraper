import mongoose from 'mongoose';

let mongooseHidden = require('mongoose-hidden')();

const { Schema } = mongoose;

const repoSchema = new Schema({
  repoId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  htmlUrl: {
    type: String,
    required: true
  },
  owner: {
    ownerId: {
      type: String,
      required: true
    },
    login: {
      type: String,
      required: true
    }
  },
  isFork: {
    type: Boolean,
    required: true
  },
  numStargazers: {
    type: Number,
    required: true
  },
  numWatchers: {
    type: Number,
    required: true
  },
  numForks: {
    type: Number,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    required: true
  },
  updatedAt: {
    type: Date,
    required: true
  },
  pushedAt: {
    type: Date,
    required: true
  },
  lastScrapedAt: {
    type: Date,
    required: true,
    default: Date.now
  }
});

// This will add `id` in toJSON
repoSchema.set('toJSON', {
  virtuals: true
});

// This will remove `_id` and `__v`
repoSchema.plugin(mongooseHidden);

export default mongoose.model('Repo', repoSchema);
