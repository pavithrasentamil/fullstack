import { teardownDb } from './mongoSetup';


export default async () => {
  await teardownDb();
};
