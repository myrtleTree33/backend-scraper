import mongoose from 'mongoose';
import {
  runUpdateUserService,
  runLoadRepoFollowersService,
  runLoadReposQueryService,
  runLoadUsersQueryService
} from './lib/services/services';
import Profile from './lib/models/Profile';

const { MONGO_URI, NUM_WORKERS_USER_UPDATE = 3 } = process.env;

// connect to Mongo
mongoose.connect(MONGO_URI);
console.log(`Connected to ${MONGO_URI}.`);

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
  runUpdateUserService({
    timeInterval: 8000,
    numWorkers: parseInt(NUM_WORKERS_USER_UPDATE, 10) // usual 5
  });

  runLoadRepoFollowersService({
    timeInterval: 2000,
    numWorkers: 1
  });

  runLoadReposQueryService({
    timeInterval: 2000,
    numWorkers: 1
  });

  runLoadUsersQueryService({
    timeInterval: 2000,
    numWorkers: 1
  });
}

if (require.main === module) {
  app();
}
