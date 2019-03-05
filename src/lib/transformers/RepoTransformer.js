import Repo from '../models/Repo';

export default async function transformRepo(input) {
  const {
    id,
    name,
    full_name,
    description,
    htmlUrl,
    owner,
    isFork,
    numStargazers,
    numWatchers,
    numForks,
    language,
    createdAt,
    updatedAt,
    pushedAt
  } = input;

  const ownerId = owner.id;
  const ownerLogin = owner.login;

  const updatedRepo = {
    repoId: id,
    name: name.toLowerCase(),
    fullName: full_name.toLowerCase(),
    description,
    htmlUrl,
    owner: {
      ownerId,
      login: ownerLogin
    },
    isFork,
    numStargazers,
    numWatchers,
    numForks,
    language,
    createdAt,
    updatedAt,
    pushedAt,
    lastScrapedAt: Date.now()
  };

  return Repo.findOneAndUpdate({ repoId: id }, updatedRepo, {
    upsert: true,
    new: true
  });
}
