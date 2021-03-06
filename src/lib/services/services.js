import moment from 'moment';
import sleep from 'await-sleep';
import { profileTools, repoTools, queryTools } from 'node-github-scraper-sdk';
import transformRepo from '../transformers/RepoTransformer';
import transformProfile from '../transformers/ProfileTransformer';
import genServiceCluster from '../services/serviceCreator';
import Profile from '../models/Profile';
import RepoQueue from '../models/RepoQueue';
import QueryQueue from '../models/QueryQueue';

const { scrapeUser } = profileTools;
const { scrapeRepo } = repoTools;
const { scrapeReposByKeyword, scrapeUsersByKeyword } = queryTools;

const {
  USER_UPDATE_TIME_QTY,
  USER_UPDATE_TIME_DENOM,
  OLD_PROFILE_SAMPLE_SIZE
} = process.env;
const userUpdateTime = parseInt(USER_UPDATE_TIME_QTY, 10);

function hasUpperCase(str) {
  return /[A-Z]/.test(str);
}

async function deleteUserIf404(resHttpStatus, username) {
  // delete user if invalid login
  if (resHttpStatus === 404) {
    console.warn(
      `404 Exception occured when scraping login=${username}, proceeding to delete user..`
    );
    await Profile.deleteOne({
      login: username.toLowerCase()
    });
  }
}

async function getRandomOldProfile(sampleSize = 1) {
  const oldProfiles =
    (await Profile.find({
      $or: [
        // { lastScrapedAt: { $exists: false } },
        { userId: { $exists: false } } // implies recently added, hence field is not there.
        // {
        //   lastScrapedAt: {
        //     $lt: moment().subtract(userUpdateTime, USER_UPDATE_TIME_DENOM),
        //     $gte: 0
        //   }
        // }
      ]
    }).limit(sampleSize)) || [];
  const maxSize = Math.min(oldProfiles.length, sampleSize);
  const i = Math.floor(Math.random() * (maxSize - 1));
  return oldProfiles[i];
}

export const runUpdateUserService = ({
  timeInterval = 5000,
  numWorkers = 2
}) => {
  const cluster = genServiceCluster(
    'updateUserService',
    timeInterval,
    numWorkers,
    async () => {
      let oldProfile = await getRandomOldProfile(
        parseInt(OLD_PROFILE_SAMPLE_SIZE, 10) || 50
      );

      // skip if there are no profiles to scrape
      if (!oldProfile) {
        return;
      }

      const { login: username, depth } = oldProfile;
      console.log(`Updating username=${username}..`);

      // update Profile's lastScrapedAt time.
      oldProfile = await Profile.updateOne(
        { login: username },
        { $set: { lastScrapedAt: Date.now() } },
        { upsert: true, new: true }
      );

      let user;
      try {
        user = await scrapeUser({
          username: username.toLowerCase(),
          maxPages: parseInt(process.env.SCRAPE_MAX_PAGES)
        });
      } catch (err) {
        const {
          response: { status: resHttpStatus }
        } = err;
        await deleteUserIf404(resHttpStatus, username);
        return; // early exit; do not save user
      }

      const upsertedUser = await transformProfile(user);

      // remove the username, if it contains a mix of
      // lowercase and uppercase.  This is to prevent
      // infinite loop bug
      if (hasUpperCase(username)) {
        console.log(`Removing login=${username} as it contains uppercase.`);
        await Profile.deleteOne({ login: username });
      }

      console.log(`current depth: ${depth} current user: ${username}`);

      // save current user's followers
      const { followerLogins } = upsertedUser;
      if (depth > 0) {
        // save each follower
        followerLogins.map(followerLogin => {
          const followerLogin2 = followerLogin.toLowerCase();
          (async () => {
            await Profile.findOneAndUpdate(
              // query
              { login: followerLogin2 },
              // saved data
              {
                login: followerLogin2,
                depth: depth - 1
              },
              // options
              {
                upsert: true,
                new: true
              }
            );
            console.log(`Saved follower login=${followerLogin2} to queue!`);
          })();
        });
      }
    }
  );

  // run cluster
  cluster.map(s => s());
};

const saveFollowerToQueue = async login => {
  const login2 = login.toLowerCase();
  return Profile.findOneAndUpdate(
    { login: login2 },
    {
      login: login2,
      lastScrapedAt: new Date(0),
      depth: 99 // set deep depth for user scraping
    },
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
 * Run load query repos service
 * @param {*} param0
 */
export const runLoadReposQueryService = ({
  timeInterval = 2000,
  numWorkers = 1
}) => {
  const cluster = genServiceCluster(
    'runLoadReposQueryService',
    timeInterval,
    numWorkers,
    async () => {
      // Find a repo to update
      const queryQueue = await QueryQueue.findOne({ type: 'repos' });

      // skip if queue empty
      if (!queryQueue) {
        return;
      }

      // delete from queue
      await QueryQueue.deleteOne({ _id: queryQueue._id });
      const { query, pages } = queryQueue;
      console.log(`Scraping query=${query}..`);

      for (let i = 1; i <= pages; i++) {
        const repos = await scrapeReposByKeyword(query, i);
        console.log(repos);
        repos.map(r => {
          (async () => {
            try {
              // add the profile to scrape
              const login = r.split('/')[0].toLowerCase();
              await Profile.findOneAndUpdate(
                { login },
                {
                  login,
                  depth: 99, // set deep depth
                  lastScrapedAt: new Date(0)
                },
                {
                  upsert: true,
                  new: true
                }
              );

              // add the repo to scrape
              await RepoQueue.findOneAndUpdate(
                { fullName: r },
                { fullName: r },
                { new: true, upsert: true }
              );
            } catch (e) {
              console.error('Error while saving repoQueue');
              console.error(e);
            }
          })();
        });
        await sleep(5000);
      }
    }
  );

  // run cluster
  cluster.map(s => s());
};

/**
 * Run load query users service
 * @param {*} param0
 */
export const runLoadUsersQueryService = ({
  timeInterval = 2000,
  numWorkers = 1
}) => {
  const cluster = genServiceCluster(
    'runLoadUsersQueryService',
    timeInterval,
    numWorkers,
    async () => {
      // Find a repo to update
      const queryQueue = await QueryQueue.findOne({ type: 'users' });

      // skip if queue empty
      if (!queryQueue) {
        return;
      }

      // delete from queue
      await QueryQueue.deleteOne({ _id: queryQueue._id });
      const { query, pages } = queryQueue;
      console.log(`Scraping query=${query}..`);

      for (let i = 1; i <= pages; i++) {
        const logins = await scrapeUsersByKeyword(query, i);
        console.log(logins);
        logins.map(login => {
          (async () => {
            try {
              // add the profile to scrape
              await Profile.findOneAndUpdate(
                { login },
                {
                  login,
                  depth: 99, // set deep depth
                  lastScrapedAt: new Date(0)
                },
                {
                  upsert: true,
                  new: true
                }
              );
            } catch (e) {
              console.error(`Error while queuing user login=${login}`);
              console.error(e);
            }
          })();
        });
        await sleep(5000);
      }
    }
  );

  // run cluster
  cluster.map(s => s());
};
