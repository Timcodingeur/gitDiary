// --- server.test.js ---
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import * as nodeFetch from 'node-fetch';
import { app, db } from '../server.js';
const PORT = 8000;
jest.mock('node-fetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('Server Tests', () => {
  let dbQueryStub;

  beforeAll(() => {
    process.env.APP_CLIENT_ID = 'mock_client_id';
    process.env.APP_CLIENT_SECRET = 'mock_client_secret';
    dbQueryStub = jest.spyOn(db, 'query');
  });

  afterAll(() => {
    dbQueryStub.mockRestore();
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
      nodeFetch.default.mockRejectedValue(new Error('Fake fetch error'));

      const res = await request(app).post('/oauth/github').send({ code: 'fake_code' });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'Fake fetch error');
    });

    it('should return data from GitHub on success (mocking fetch)', async () => {
      nodeFetch.default.mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: '12345' }),
      });

      const res = await request(app).post('/oauth/github').send({ code: 'some_code' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ access_token: '12345' });
    });

    it('should handle non-2xx fetch response from GitHub', async () => {
      nodeFetch.default.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'bad request' }),
      });

      const res = await request(app).post('/oauth/github').send({ code: 'bad_code' });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'GitHub OAuth failed with status 400');
    });
  });

  // ----------- POST /add-time -----------
  describe('POST /add-time', () => {
    it('should return 400 if hash or time is missing', async () => {
      const res = await request(app).post('/add-time').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Missing hash or time in body');
    });

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
    it('should return 400 if hash is not provided in the request', async () => {
      const res = await request(app).get('/get-time/');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Missing hash in params');
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
  describe('Catch-all route', () => {
    it('should redirect to / for unknown GET route', async () => {
      const res = await request(app).get('/random-route');
      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/');
    });

    it('should redirect to / for unknown POST route', async () => {
      const res = await request(app).post('/unknown-route');
      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/');
    });

    it('should redirect to / for unknown PUT route', async () => {
      const res = await request(app).put('/unknown-route');
      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/');
    });
  });

  // ----------- Global Error Handler -----------
  describe('Global error handler', () => {
    it('should handle unexpected errors', async () => {
      dbQueryStub.mockImplementation(() => {
        throw new Error('Unexpected DB error');
      });

      const res = await request(app).post('/add-time').send({ hash: 'test', time: 123 });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'Unexpected DB error');
    });
  });
});
app.get('/', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/callback', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/oauth/github', async (req, res, next) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Missing code parameter' });
  }

  const client_id = CLIENT_ID;
  const client_secret = CLIENT_SECRET;

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ client_id, client_secret, code }),
    });

    if (!response.ok) {
      throw new Error(`GitHub OAuth failed with status ${response.status}`);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

app.post('/add-time', (req, res, next) => {
  const { hash, time } = req.body;
  if (!hash || time === undefined) {
    return res.status(400).json({ error: 'Missing hash or time in body' });
  }

  const querySelect = 'SELECT * FROM t_commits WHERE hash = ?';
  db.query(querySelect, [hash], (err, result) => {
    if (err) {
      return next(err);
    }
    if (result.length > 0) {
      const query = 'UPDATE t_commits SET time = ? WHERE hash = ?';
      db.query(query, [time, hash], (errUpdate) => {
        if (errUpdate) {
          return next(errUpdate);
        }
        return res.status(200).json({ message: 'Time updated' });
      });
    } else {
      const query = 'INSERT INTO t_commits (hash, time) VALUES (?, ?)';
      db.query(query, [hash, time], (errInsert) => {
        if (errInsert) {
          return next(errInsert);
        }
        return res.status(201).json({ message: 'Time added' });
      });
    }
  });
});

app.get('/get-time/:hash', (req, res, next) => {
  const { hash } = req.params;
  if (!hash) {
    return res.status(400).json({ error: 'Missing hash in params' });
  }

  const query = 'SELECT time FROM t_commits WHERE hash = ?';
  db.query(query, [hash], (err, result) => {
    if (err) {
      return next(err);
    }
    return res.json(result);
  });
});

app.all('*', (req, res) => {
  return res.redirect('/');
});

app.use((err, req, res, next) => {
  console.error('Global error handler:', err.message);
  return res.status(500).json({ error: err.message || 'Internal server error' });
});

export const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});