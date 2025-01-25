import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import * as nodeFetch from 'node-fetch';
import { app, db } from '../server.js';

jest.mock('node-fetch', () => {
  const actualFetch = jest.requireActual('node-fetch');
  return {
    __esModule: true,
    default: jest.fn(actualFetch.default), // Mock avec possibilité d'appels réels
  };
});

describe('Server Tests', () => {
  let dbQueryStub;
  let fetchMock;

  beforeAll(() => {
    dbQueryStub = jest.spyOn(db, 'query');
    fetchMock = nodeFetch.default;
  });

  afterAll(() => {
    dbQueryStub.mockRestore();
    fetchMock.mockRestore();
  });

  // ----------- GET / -----------
  describe('GET /', () => {
    it('should return the index.html file (status 200)', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
    });
  });

  // ----------- GET /callback -----------
  describe('GET /callback', () => {
    it('should return index.html (status 200)', async () => {
      const res = await request(app).get('/callback');
      expect(res.status).toBe(200);
    });
  });

  // ----------- POST /oauth/github -----------
  describe('POST /oauth/github', () => {
    it('should return 400 if no code is provided', async () => {
      const res = await request(app).post('/oauth/github').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Missing code parameter');
    });

    it('should return 500 if fetch fails', async () => {
      fetchMock.mockRejectedValue(new Error('Fake fetch error'));

      const res = await request(app).post('/oauth/github').send({ code: 'fake_code' });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'Fake fetch error');
    });

    it('should return data from GitHub on success (mocking fetch)', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: '12345' })
      });

      const res = await request(app).post('/oauth/github').send({ code: 'some_code' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ access_token: '12345' });
    });

    it('should handle non-2xx fetch response from GitHub', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'bad request' })
      });

      const res = await request(app).post('/oauth/github').send({ code: 'bad_code' });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'GitHub OAuth failed with status 400');
    });
  });

  // ----------- POST /add-time -----------
  describe('POST /add-time', () => {
    it('should handle DB error on SELECT', async () => {
      dbQueryStub.mockImplementation((query, values, callback) => {
        callback(new Error('DB SELECT error'), null);
      });

      const res = await request(app).post('/add-time').send({ hash: 'abc', time: 10 });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'DB SELECT error');
    });

    it('should update time if hash exists', async () => {
      dbQueryStub.mockImplementationOnce((query, values, callback) => {
        callback(null, [{ hash: 'abc', time: 5 }]);
      }).mockImplementationOnce((query, values, callback) => {
        callback(null, { affectedRows: 1 });
      });

      const res = await request(app).post('/add-time').send({ hash: 'abc', time: 10 });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Time updated' });
    });

    it('should handle DB error on UPDATE', async () => {
      dbQueryStub.mockImplementationOnce((query, values, callback) => {
        callback(null, [{ hash: 'abc' }]);
      }).mockImplementationOnce((query, values, callback) => {
        callback(new Error('DB UPDATE error'));
      });

      const res = await request(app).post('/add-time').send({ hash: 'abc', time: 10 });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'DB UPDATE error');
    });

    it('should insert time if hash does not exist', async () => {
      dbQueryStub.mockImplementationOnce((query, values, callback) => {
        callback(null, []);
      }).mockImplementationOnce((query, values, callback) => {
        callback(null, { insertId: 123 });
      });

      const res = await request(app).post('/add-time').send({ hash: 'def', time: 20 });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ message: 'Time added' });
    });

    it('should handle DB error on INSERT', async () => {
      dbQueryStub.mockImplementationOnce((query, values, callback) => {
        callback(null, []);
      }).mockImplementationOnce((query, values, callback) => {
        callback(new Error('DB INSERT error'));
      });

      const res = await request(app).post('/add-time').send({ hash: 'def', time: 20 });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'DB INSERT error');
    });
  });

  // ----------- GET /get-time/:hash -----------
  describe('GET /get-time/:hash', () => {
    it('should return 400 if hash is missing', async () => {
      const res = await request(app).get('/get-time/'); 
      expect(res.status).toBe(404); 

    });

    it('should handle DB error', async () => {
      dbQueryStub.mockImplementation((query, values, callback) => {
        callback(new Error('DB TIME error'), null);
      });

      const res = await request(app).get('/get-time/somehash');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'DB TIME error');
    });

    it('should return the time from DB', async () => {
      dbQueryStub.mockImplementation((query, values, callback) => {
        callback(null, [{ time: 123 }]);
      });

      const res = await request(app).get('/get-time/somehash');
      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toHaveProperty('time', 123);
    });
  });

  // ----------- Catch-all route -----------
  describe('GET /random-route', () => {
    it('should redirect to / (302)', async () => {
      const res = await request(app).get('/random-route');
      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/');
    });
  });
});
