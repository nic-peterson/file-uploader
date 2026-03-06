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
      createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://test.supabase.co/signed/test' }, error: null }),
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

beforeEach(() => {
  jest.clearAllMocks();
  fileModel.getFilesByUser.mockResolvedValue([]);
  fileModel.getRootFiles.mockResolvedValue([]);
  fileModel.countRootFiles.mockResolvedValue(0);
  folderModel.getFoldersByUser.mockResolvedValue([]);
});

describe('GET /signup', () => {
  test('renders signup page', async () => {
    const res = await request(app).get('/signup');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Sign Up');
  });
});

describe('GET /login', () => {
  test('renders login page', async () => {
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Log In');
  });
});

describe('POST /signup', () => {
  test('redirects to dashboard on successful signup', async () => {
    userModel.findByEmail.mockResolvedValue(null);
    userModel.createUser.mockResolvedValue(FAKE_USER);
    userModel.findById.mockResolvedValue(FAKE_USER);

    const agent = request.agent(app);
    const res = await agent
      .post('/signup')
      .send({ email: 'test@example.com', password: 'password123', name: 'Test User' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
  });

  test('redirects back to signup if email is already taken', async () => {
    userModel.findByEmail.mockResolvedValue(FAKE_USER);

    const res = await request(app)
      .post('/signup')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/signup');
  });

  test('redirects back to signup if email is missing', async () => {
    const res = await request(app).post('/signup').send({ password: 'password123' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/signup');
  });

  test('redirects back to signup if password is missing', async () => {
    const res = await request(app).post('/signup').send({ email: 'test@example.com' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/signup');
  });
});

describe('POST /login', () => {
  test('redirects to dashboard on valid credentials', async () => {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 1);
    userModel.findByEmail.mockResolvedValue({ ...FAKE_USER, password: hashedPassword });

    const agent = request.agent(app);
    const res = await agent
      .post('/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
  });

  test('redirects back to login on wrong password', async () => {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('correct-password', 1);
    userModel.findByEmail.mockResolvedValue({ ...FAKE_USER, password: hashedPassword });

    const res = await request(app)
      .post('/login')
      .send({ email: 'test@example.com', password: 'wrong-password' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('redirects back to login when email is not found', async () => {
    userModel.findByEmail.mockResolvedValue(null);

    const res = await request(app)
      .post('/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });
});

describe('GET /dashboard', () => {
  test('redirects unauthenticated users to /login', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('renders dashboard for authenticated users', async () => {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 1);
    userModel.findByEmail.mockResolvedValue({ ...FAKE_USER, password: hashedPassword });
    userModel.findById.mockResolvedValue(FAKE_USER);

    const agent = request.agent(app);
    await agent.post('/login').send({ email: 'test@example.com', password: 'password123' });

    const res = await agent.get('/dashboard');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Welcome');
  });
});

describe('POST /logout', () => {
  test('redirects unauthenticated users to /login', async () => {
    const res = await request(app).post('/logout');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('logs out authenticated user and redirects to /login', async () => {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 1);
    userModel.findByEmail.mockResolvedValue({ ...FAKE_USER, password: hashedPassword });
    userModel.findById.mockResolvedValue(FAKE_USER);

    const agent = request.agent(app);
    await agent.post('/login').send({ email: 'test@example.com', password: 'password123' });

    const res = await agent.post('/logout');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });
});
