import path from 'path';
import fs from 'fs';
require('isomorphic-fetch');

import loadConfig from '../../src/config/load';
import { email, password } from '../../src/mongoose/testCredentials';
import fileExists from './utils/fileExists';

const { serverURL } = loadConfig();

const mediaDir = path.join(__dirname, '../../demo', 'media');

export default async () => {
  const mediaDirExists = await fileExists(mediaDir);
  if (mediaDirExists) {
    fs.rmdirSync(mediaDir, { recursive: true });
  }
  const response = await fetch(`${serverURL}/api/admins/first-register`, {
    body: JSON.stringify({
      email,
      password,
      roles: ['admin', 'user'],
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'post',
  });

  const data = await response.json();

  if (!data.user || !data.user.token) {
    throw new Error('Failed to register first user');
  }
};
