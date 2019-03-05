import moment from 'moment';
import { profileTools, repoTools } from 'node-github-scraper-sdk';
import transformRepo from '../transformers/RepoTransformer';
import transformProfile from '../transformers/ProfileTransformer';
import genServiceCluster from '../services/serviceCreator';
import Profile from '../models/Profile';

const { scrapeUser } = profileTools;

const { USER_UPDATE_TIME_QTY, USER_UPDATE_TIME_DENOM } = process.env;
const userUpdateTime = parseInt(USER_UPDATE_TIME_QTY, 10);

export const runUpdateUserService = () => {
  const cluster = genServiceCluster('updateUserService', 2000, 1, async () => {
    const oldProfile = await Profile.findOneAndUpdate(
      {
        $or: [
          { lastScrapedAt: { $exists: false } },
          {
            lastScrapedAt: {
              $lt: moment().subtract(userUpdateTime, USER_UPDATE_TIME_DENOM),
              $gte: 0
            }
          }
        ]
      },
      // update time lock to prevent scraping
      // by other workers
      {
        $set: { lastScrapedAt: Date.now() }
      }
    );

    if (!oldProfile) {
      return;
    }

    const { login: username } = oldProfile;
    console.log(`Updating username=${username}..`);
    const user = await scrapeUser({ username });
    await transformProfile(user);
  });

  // run cluster
  cluster.map(s => s());
};
