import moment from 'moment';
import { profileTools, repoTools } from 'node-github-scraper-sdk';
import transformRepo from '../transformers/RepoTransformer';
import transformProfile from '../transformers/ProfileTransformer';
import genServiceCluster from '../services/serviceCreator';
import Profile from '../models/Profile';
import RepoQueue from '../models/RepoQueue';

const { scrapeUser } = profileTools;
const { scrapeRepo } = repoTools;

const { USER_UPDATE_TIME_QTY, USER_UPDATE_TIME_DENOM } = process.env;
const userUpdateTime = parseInt(USER_UPDATE_TIME_QTY, 10);

export const runUpdateUserService = ({
  timeInterval = 2000,
  numWorkers = 2
}) => {
  const cluster = genServiceCluster(
    'updateUserService',
    timeInterval,
    numWorkers,
    async () => {
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

      const { login: username, depth } = oldProfile;
      console.log(`Updating username=${username}..`);
      const user = await scrapeUser({
        username,
        maxPages: parseInt(process.env.SCRAPE_MAX_PAGES)
      });

      const upsertedUser = await transformProfile(user);

      console.log(`current depth: ${depth} current user: ${user}`);

      // save the rest of the followers, if needed
      const { followerLogins } = upsertedUser;
      if (depth > 0) {
        // save each follower
        followerLogins.map(followerLogin => {
          Profile.findOneAndUpdate(
            // query
            { login: followerLogin },
            // saved data
            {
              login: followerLogin,
              depth: depth - 1
            },
            // options
            {
              upsert: true,
              new: true
            }
          );
        });
      }
    }
  );

  // run cluster
  cluster.map(s => s());
};

const saveFollowerToQueue = async login => {
  return Profile.findOneAndUpdate(
    { login },
    { login, lastScrapedAt: new Date(0) },
    { new: true, upsert: true }
  );
};

/**
 * Run load repo service
 * @param {*} param0
 */
export const runLoadRepoFollowersService = ({
  timeInterval = 2000,
  numWorkers = 1
}) => {
  const cluster = genServiceCluster(
    'runLoadRepoFollowersService',
    timeInterval,
    numWorkers,
    async () => {
      // Find a repo to update
      const repoQueue = await RepoQueue.findOne({});

      // skip if queue empty
      if (!repoQueue) {
        return;
      }

      // delete from queue
      await RepoQueue.deleteOne({ _id: repoQueue._id });

      const fullName = repoQueue.fullName.toLowerCase();
      console.log(`Scraping ${fullName}..`);

      // Scrape the repo
      const repoInfo = await scrapeRepo({
        repo: fullName,
        maxPages: 10,
        skipFollowers: false
      });

      // skip if no such repo
      if (!repoInfo) {
        return;
      }

      // save followers
      const { followers } = repoInfo;
      const saveFollowerPromises = followers.map(f => {
        const login = f.handle.toLowerCase();
        return saveFollowerToQueue(login);
      });

      console.log(
        `Saving ${saveFollowerPromises.length} profiles from repo=${fullName}..`
      );

      await Promise.all(saveFollowerPromises);
    }
  );

  // run cluster
  cluster.map(s => s());
};

/**
 * Run load query service
 * @param {*} param0
 */
export const runLoadQueryService = ({
  timeInterval = 2000,
  numWorkers = 1
}) => {
  const cluster = genServiceCluster(
    'runLoadQueryService',
    timeInterval,
    numWorkers,
    async () => {
      // Find a repo to update
      const QueryQueue = await QueryQueue.findOne({});

      // skip if queue empty
      if (!repoQueue) {
        return;
      }

      // delete from queue
      await RepoQueue.deleteOne({ _id: repoQueue._id });

      const fullName = repoQueue.fullName.toLowerCase();
      console.log(`Scraping ${fullName}..`);

      // Scrape the repo
      const repoInfo = await scrapeRepo({
        repo: fullName,
        maxPages: 10,
        skipFollowers: false
      });

      // skip if no such repo
      if (!repoInfo) {
        return;
      }

      // save followers
      const { followers } = repoInfo;
      const saveFollowerPromises = followers.map(f => {
        const login = f.handle.toLowerCase();
        return saveFollowerToQueue(login);
      });

      console.log(
        `Saving ${saveFollowerPromises.length} profiles from repo=${fullName}..`
      );

      await Promise.all(saveFollowerPromises);
    }
  );

  // run cluster
  cluster.map(s => s());
};
