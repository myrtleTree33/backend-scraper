import Commit from '../models/Commit';

export default async function transformCommit(userId, input) {
  const { date, count } = input;

  const updatedCommit = { userId, date, count };

  return Commit.findOneAndUpdate({ userId, date }, updatedCommit, {
    upsert: true,
    new: true
  });
}
