import opencage from 'opencage-api-client';
import _ from 'lodash';
import axios from 'axios';

import Profile from '../models/Profile';
import transformRepo from './RepoTransformer';
import transformCommit from './CommitTransformer';

const { GEOCODE_URL } = process.env;

async function decodeLocation(location) {
  const res = await axios.post(`${GEOCODE_URL}/geocode/decode`, {
    query: location
  });
  const { countryNames, cityNames } = res.data;
  return { countries: countryNames, cities: cityNames };
}

async function saveRepos(repos) {
  repos.map(r =>
    transformRepo(r).catch(e => console.error(`Could not save ${r.id}, ${e}`))
  );
}

async function saveCommits(id, commits) {
  commits.map(c => transformCommit(id, c).catch(e => console.error(e)));
}

export default async function transformProfile(input) {
  const { starredRepos, ownedRepos, followers, commitHistory } = input;
  const {
    id,
    name,
    login,
    htmlUrl,
    profilePic,
    company,
    blog,
    location,
    isHireable,
    bio,
    publicRepos,
    publicGists,
    numFollowers,
    numFollowing,
    createdAt,
    updatedAt
  } = input;

  // console.log(input);

  // console.log(starredRepos.repos.length);
  // console.log(ownedRepos.repos.length);
  // console.log(followers.length);
  // console.log(commitHistory.length);

  const { countries = [], cities = [] } = await decodeLocation(location);

  await saveRepos(ownedRepos.repos);
  await saveRepos(starredRepos.repos);
  const followerLogins = followers.map(f => f.login.toString().toLowerCase());
  const starredRepoIds = starredRepos.repos.map(s => s.id.toString());
  const ownedRepoIds = ownedRepos.repos.map(s => s.id.toString());
  await saveCommits(id, commitHistory);

  const updatedProfile = _.pickBy(
    {
      userId: id,
      name,
      login: login.toLowerCase(),
      htmlUrl,
      profilePic,
      company,
      blog,
      location: location.toLowerCase(),
      countries,
      cities,
      isHireable,
      bio,
      starredReposLangs: starredRepos.languages,
      ownedReposLangs: ownedRepos.languages,
      numPublicRepos: publicRepos,
      numPublicGists: publicGists,
      numFollowers,
      numFollowing,
      starredRepoIds,
      ownedRepoIds,
      followerLogins,
      createdAt,
      updatedAt,
      lastScrapedAt: Date.now(),
      depth: 0 // always set depth to 0 after scraping
    },
    _.identity
  );

  return Profile.findOneAndUpdate(
    { login: login.toLowerCase() },
    updatedProfile,
    {
      upsert: true,
      new: true
    }
  );
}
