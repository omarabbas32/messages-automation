import request from 'supertest';
import { expect } from 'chai';
import app from '../server.js';

describe('Vector Search endpoints (basic)', function () {
  it('POST /api/search/vector should return 400 when query missing', async () => {
    const res = await request(app).post('/api/search/vector').send({});
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property('success', false);
  });

  it('POST /api/search/vector should return 500 when OpenAI not configured', async () => {
    // Provide a query but ensure OPENAI_API_KEY is not set in environment
    const res = await request(app).post('/api/search/vector').send({ query: 'hello' });
    expect(res.status).to.equal(500);
    expect(res.body).to.have.property('success', false);
    expect(res.body.error).to.match(/OpenAI not configured/i);
  });

  it('POST /api/search/documents should return 400 when query missing', async () => {
    const res = await request(app).post('/api/search/documents').send({});
    expect(res.status).to.equal(400);
  });

  it('POST /api/search/documents should return 500 when OpenAI not configured', async () => {
    const res = await request(app).post('/api/search/documents').send({ query: 'test' });
    expect(res.status).to.equal(500);
    expect(res.body.error).to.match(/OpenAI not configured/i);
  });
});
