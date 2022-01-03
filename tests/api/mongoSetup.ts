import { MongoClient } from 'mongodb';

async function connect(): Promise<MongoClient> {
  return await MongoClient.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

const databaseName = `payload-integration`

export async function setupDb(): Promise<void> {
  const client = await connect();
  const db = client.db(databaseName);
  db.dropDatabase();
}

export async function teardownDb(): Promise<void> {
  const client = await connect();
  const db = client.db(databaseName);
  await db.dropDatabase();
  await client.close();
}
