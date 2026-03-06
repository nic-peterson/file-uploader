const request = require('supertest');

jest.mock('connect-pg-simple', () => {
  return () => {
    const session = require('express-session');
    return session.MemoryStore;
  };
});

jest.mock('../src/models/userModel');
jest.mock('../src/models/fileModel');
jest.mock('../src/models/folderModel');
jest.mock('../src/models/passwordResetModel');
jest.mock('../src/config/supabase', () => ({
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://test.supabase.co/...' } }),
      remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  },
}));

const userModel = require('../src/models/userModel');
const fileModel = require('../src/models/fileModel');
const folderModel = require('../src/models/folderModel');
const app = require('../src/app');

const FAKE_USER = {
  id: 'uuid-test-1',
  email: 'test@example.com',
  password: '$2b$12$hashedpassword',
  name: 'Test User',
};

const loginAgent = async () => {
  const bcrypt = require('bcrypt');
  const hashedPassword = await bcrypt.hash('password123', 1);
  userModel.findByEmail.mockResolvedValue({ ...FAKE_USER, password: hashedPassword });
  userModel.findById.mockResolvedValue(FAKE_USER);
  const agent = request.agent(app);
  await agent.post('/login').send({ email: 'test@example.com', password: 'password123' });
  return agent;
};

beforeEach(() => {
  jest.clearAllMocks();
  fileModel.getFilesByUser.mockResolvedValue([]);
  folderModel.getFoldersByUser.mockResolvedValue([]);
});

describe('API Endpoints', () => {
  test('GET / redirects to /login', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('GET /api/test should return test message', async () => {
    const res = await request(app).get('/api/test');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'API is working!' });
  });
});

describe('404 handler', () => {
  test('unauthenticated user hitting unknown route redirects to /login', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('authenticated user hitting unknown route redirects to /dashboard', async () => {
    const agent = await loginAgent();
    const res = await agent.get('/nonexistent');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
  });
});
