import asyncWhile from 'async-while';
import sleep from 'await-sleep';
import moment from 'moment';

function genServiceSingle(serviceName, timeInterval, fn, fnArgs) {
  const asyncWhileLoop = asyncWhile(
    () => {
      return true;
    },
    () => {
      return (async () => {
        try {
          // console.log(`Running ${serviceName} at ${moment().format()}..`);
          await fn();
        } catch (e) {
          console.error(`Exception occured runing service=${serviceName}`);
          console.error(e);
        }
        return sleep(timeInterval * Math.random());
      })();
    }
  );

  return asyncWhileLoop;
}

export default function genServiceCluster(
  serviceName,
  timeInterval,
  numWorkers = 1,
  fn,
  fnArgs
) {
  const cluster = [];
  console.log(
    `Running ${serviceName} with numWorkers=${numWorkers} at ${moment().format()}..`
  );
  for (let i = 0; i < numWorkers; i++) {
    cluster.push(
      genServiceSingle(`${serviceName}[${i}]`, timeInterval, fn, fnArgs)
    );
  }
  return cluster;
}
