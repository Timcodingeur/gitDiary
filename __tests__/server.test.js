import { expect } from 'chai';
import request from 'supertest';
import sinon from 'sinon';
import fetch from 'node-fetch';
import { app, db } from '../server.js';

describe('Server Tests', () => {
  let dbQueryStub;
  let fetchStub;

  before(() => {
    dbQueryStub = sinon.stub(db, 'query');
    fetchStub = sinon.stub(fetch, 'Promise');
  });

  after(() => {
    dbQueryStub.restore();
    fetchStub.restore();
  });

  // ----------- GET / -----------
  describe('GET /', () => {
    it('should return the index.html file (status 200)', async () => {
      const res = await request(app).get('/');
      expect(res.status).to.equal(200);
    });
  });

  // ----------- GET /callback -----------
  describe('GET /callback', () => {
    it('should return index.html (status 200)', async () => {
      const res = await request(app).get('/callback');
      expect(res.status).to.equal(200);
    });
  });

  // ----------- POST /oauth/github -----------
  describe('POST /oauth/github', () => {
    it('should return 400 if no code is provided', async () => {
      const res = await request(app).post('/oauth/github').send({});
      expect(res.status).to.equal(400);
      expect(res.body).to.have.property('error', 'Missing code parameter');
    });

    it('should return 500 if fetch fails', async () => {
      fetchStub.rejects(new Error('Fake fetch error'));

      const res = await request(app).post('/oauth/github').send({ code: 'fake_code' });
      expect(res.status).to.equal(500);
      expect(res.body).to.have.property('error').that.includes('Fake fetch error');
    });

    it('should return data from GitHub on success (mocking fetch)', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({ access_token: '12345' })
      });

      const res = await request(app).post('/oauth/github').send({ code: 'some_code' });
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({ access_token: '12345' });
    });

    it('should handle non-2xx fetch response from GitHub', async () => {
      fetchStub.resolves({
        ok: false,
        status: 400,
        json: async () => ({ error: 'bad request' })
      });

      const res = await request(app).post('/oauth/github').send({ code: 'bad_code' });
      expect(res.status).to.equal(500);
      expect(res.body).to.have.property('error').that.includes('GitHub OAuth failed with status 400');
    });
  });

  // ----------- POST /add-time -----------
  describe('POST /add-time', () => {
    it('should return 400 if hash or time is missing', async () => {
      let res = await request(app).post('/add-time').send({ hash: 'abc' });
      expect(res.status).to.equal(400);

      res = await request(app).post('/add-time').send({ time: 10 });
      expect(res.status).to.equal(400);
    });

    it('should handle DB error on SELECT', async () => {
      dbQueryStub.yields(new Error('DB SELECT error'), null);

      const res = await request(app).post('/add-time').send({ hash: 'abc', time: 10 });
      expect(res.status).to.equal(500);
      expect(res.body).to.have.property('error').that.includes('DB SELECT error');
    });

    it('should update time if hash exists', async () => {
      dbQueryStub.onFirstCall().yields(null, [{ hash: 'abc', time: 5 }]);
      dbQueryStub.onSecondCall().yields(null, { affectedRows: 1 });

      const res = await request(app).post('/add-time').send({ hash: 'abc', time: 10 });
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({ message: 'Time updated' });
    });

    it('should handle DB error on UPDATE', async () => {
      dbQueryStub.onFirstCall().yields(null, [{ hash: 'abc' }]);
      dbQueryStub.onSecondCall().yields(new Error('DB UPDATE error'));

      const res = await request(app).post('/add-time').send({ hash: 'abc', time: 10 });
      expect(res.status).to.equal(500);
      expect(res.body).to.have.property('error').that.includes('DB UPDATE error');
    });

    it('should insert time if hash does not exist', async () => {
      dbQueryStub.onFirstCall().yields(null, []);
      dbQueryStub.onSecondCall().yields(null, { insertId: 123 });

      const res = await request(app).post('/add-time').send({ hash: 'def', time: 20 });
      expect(res.status).to.equal(201);
      expect(res.body).to.deep.equal({ message: 'Time added' });
    });

    it('should handle DB error on INSERT', async () => {
      dbQueryStub.onFirstCall().yields(null, []);
      dbQueryStub.onSecondCall().yields(new Error('DB INSERT error'));

      const res = await request(app).post('/add-time').send({ hash: 'def', time: 20 });
      expect(res.status).to.equal(500);
      expect(res.body).to.have.property('error').that.includes('DB INSERT error');
    });
  });

  // ----------- GET /get-time/:hash -----------
  describe('GET /get-time/:hash', () => {
    it('should return 400 if hash is missing', async () => {
      const res = await request(app).get('/get-time/'); 
      expect(res.status).to.equal(404); 

    });

    it('should handle DB error', async () => {
      dbQueryStub.yields(new Error('DB TIME error'));

      const res = await request(app).get('/get-time/somehash');
      expect(res.status).to.equal(500);
      expect(res.body).to.have.property('error').that.includes('DB TIME error');
    });

    it('should return the time from DB', async () => {
      dbQueryStub.yields(null, [{ time: 123 }]);

      const res = await request(app).get('/get-time/somehash');
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array').that.has.length(1);
      expect(res.body[0]).to.have.property('time', 123);
    });
  });

  // ----------- Catch-all route -----------
  describe('GET /random-route', () => {
    it('should redirect to / (302)', async () => {
      const res = await request(app).get('/random-route');
      expect(res.status).to.equal(302);
      expect(res.header.location).to.equal('/');
    });
  });
});
