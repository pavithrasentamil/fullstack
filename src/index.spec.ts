import express from 'express';
// import * as http from 'http';
import type { Express } from 'express-serve-static-core';
import request from 'supertest';
import { Config, InitOptions, SanitizedConfig } from './config/types';
import { email, password } from './mongoose/testCredentials';


import Logger from './utilities/logger';
import { buildConfig } from './config/build';
import payload from '.';
import validate from './config/validate';
import { defaults } from './config/defaults';

import * as load from './config/load';
// import * as connect from './mongoose/connect';
import { CollectionConfig } from './collections/config/types';

// require('isomorphic-fetch');

const localLogger = Logger();
const serverURL = 'http://localhost:3000';

jest.spyOn(load, 'default').mockImplementation(() => buildSanitizedConfig());
// jest.spyOn(connect, 'default').mockImplementation(() => null);

describe('Payload', () => {
  // let appInstance: http.Server;
  let expressApp: Express;

  beforeAll(async () => {
    expressApp = express();
    payload.init(generateInitOptions(expressApp));
    expressApp.get('/health', (_, res) => {
      res.sendStatus(200);
    });
    // appInstance = expressApp.listen(3000, async () => {
    //   payload.logger.info(`Admin URL on ${payload.getAdminURL()}`);
    //   payload.logger.info(`API URL on ${payload.getAPIURL()}`);
    //   await initFirstUser();
    // });
  });

  afterAll(() => {
    // appInstance.close();
  });

  describe('#init', () => {
    it('should mount all routes', async () => {
      const res = await request(expressApp)
        .get('/api/code')
        .send();
      expect(res.statusCode).toStrictEqual(200);
      // const res = await request(expressApp)
      //   .post('/api/admins/first-register')
      //   .send({
      //     email,
      //     password,
      //     roles: ['admin', 'user'],
      //   });
      // expect(res.statusCode).toStrictEqual(201);
    });
  });
});

function generateInitOptions(expressApp): InitOptions {
  const options: InitOptions = {
    secret: 'SECRET_KEY',
    // mongoURL: process.env.MONGO_URL || 'mongodb://localhost/payload',
    mongoURL: 'mongodb://localhost/unittest',
    express: expressApp,
    onInit: (app) => {
      app.logger.info('Payload Server Initialized');
    },
  };

  return options;
}

function buildSanitizedConfig(): SanitizedConfig {
  const testCollection: CollectionConfig = {
    slug: 'code',
    labels: {
      singular: 'Code',
      plural: 'Codes',
    },
    fields: [
      {
        name: 'code',
        type: 'code',
        label: 'Code',
        required: true,
        admin: {
          language: 'js',
          description: 'javascript example',
        },
      },
    ],
  };

  const Admins: CollectionConfig = {
    slug: 'admins',
    fields: [
      {
        name: 'roles',
        label: 'Role',
        type: 'select',
        options: [
          'admin',
          'editor',
          'moderator',
          'user',
          'viewer',
        ],
        defaultValue: 'user',
        required: true,
        saveToJWT: true,
        hasMany: true,
      },
    ],
  };

  const config: Config = {
    serverURL,
    admin: {
      user: 'admins',
    },
    collections: [
      Admins,
      testCollection,
    ],
  };
  const configDefaults = { ...defaults, ...config };
  return validate(buildConfig(configDefaults as unknown as Config), localLogger);
}

async function initFirstUser() {
  try {
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
  } catch (error) {
    console.error(error);
    throw error;
  }
}
