import mongoose from 'mongoose';

let mongooseHidden = require('mongoose-hidden')();

const { Schema } = mongoose;

const profileSchema = new Schema({
  name: {
    type: String
  },
  login: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String
  },
  htmlUrl: {
    type: String
  },
  profilePic: {
    type: String
  },
  company: {
    type: String
  },
  blog: {
    type: String
  },
  location: {
    type: String
  },
  countries: {
    type: [String],
    default: []
  },
  cities: {
    type: [String],
    default: []
  },
  countryManual: {
    type: String,
    default: ''
  },
  stateManual: {
    type: String,
    default: ''
  },
  isHireable: {
    type: Boolean,
    default: true
  },
  bio: {
    type: String
  },
  numPublicRepos: {
    type: Number
  },
  numStarredRepos: {
    type: Number
  },
  numPublicGists: {
    type: Number
  },
  numFollowers: {
    type: Number
  },
  numFollowing: {
    type: Number
  },
  createdAt: {
    type: Date
  },
  updatedAt: {
    type: Date
  },
  followerLogins: {
    type: [String],
    default: []
  },
  starredRepoIds: {
    type: [String],
    default: []
  },
  ownedRepoIds: {
    type: [String],
    default: []
  },
  lastScrapedAt: {
    type: Date,
    default: Date.now
  },
  email: {
    type: [String],
    default: []
  },
  linkedinId: {
    type: String
  },
  twitterId: {
    type: String
  },
  telegramId: {
    type: String
  },
  depth: {
    type: Number,
    default: 0
  },
  starredReposLangs: {
    type: Object,
    default: {}
  },
  ownedReposLangs: {
    type: Object,
    default: {}
  }
});

// This will add `id` in toJSON
profileSchema.set('toJSON', {
  virtuals: true
});

// This will remove `_id` and `__v`
profileSchema.plugin(mongooseHidden);

export default mongoose.model('Profile', profileSchema);
