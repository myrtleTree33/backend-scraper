import mongoose from 'mongoose';
import { runUpdateUserService } from './lib/services/services';
import Profile from './lib/models/Profile';

const { MONGO_URI } = process.env;

// connect to Mongo
mongoose.connect(MONGO_URI);

// load environment variables
const dotenv = require('dotenv');
dotenv.load();

// comment if unused
// new Profile({
//   login: 'joanneong',
//   lastScrapedAt: Date.now()
// }).save();

export default function app() {
  console.log('Running Scraper..');
  runUpdateUserService();
}

if (require.main === module) {
  app();
}
