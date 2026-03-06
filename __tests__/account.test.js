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

const loginAgent = async () => {
  const bcrypt = require('bcrypt');
  const hashedPassword = await bcrypt.hash('password123', 1);
  userModel.findByEmail.mockResolvedValue({ ...FAKE_USER, password: hashedPassword });
  userModel.findById.mockResolvedValue({ ...FAKE_USER, password: hashedPassword });
  const agent = request.agent(app);
  await agent.post('/login').send({ email: 'test@example.com', password: 'password123' });
  return agent;
};

beforeEach(() => {
  jest.clearAllMocks();
  fileModel.getFilesByUser.mockResolvedValue([]);
  fileModel.getRootFiles.mockResolvedValue([]);
  fileModel.countRootFiles.mockResolvedValue(0);
  folderModel.getFoldersByUser.mockResolvedValue([]);
});

describe('GET /account', () => {
  test('redirects unauthenticated users to /login', async () => {
    const res = await request(app).get('/account');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('renders account page for authenticated users', async () => {
    const agent = await loginAgent();
    const res = await agent.get('/account');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Account');
    expect(res.text).toContain(FAKE_USER.email);
  });
});

describe('POST /account/profile', () => {
  test('redirects unauthenticated users to /login', async () => {
    const res = await request(app).post('/account/profile').send({ email: 'new@example.com' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('updates profile and redirects to /account', async () => {
    userModel.findByEmail.mockResolvedValue(null);
    userModel.updateProfile.mockResolvedValue({ ...FAKE_USER, name: 'New Name', email: 'new@example.com' });
    const agent = await loginAgent();

    userModel.findByEmail.mockResolvedValue(null);
    const res = await agent.post('/account/profile').send({ name: 'New Name', email: 'new@example.com' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/account');
    expect(userModel.updateProfile).toHaveBeenCalledWith(
      FAKE_USER.id,
      expect.objectContaining({ name: 'New Name', email: 'new@example.com' })
    );
  });

  test('flashes error when email is missing', async () => {
    const agent = await loginAgent();
    const res = await agent.post('/account/profile').send({ name: 'Test', email: '' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/account');
    expect(userModel.updateProfile).not.toHaveBeenCalled();
  });

  test('flashes error when email is already taken by another user', async () => {
    const agent = await loginAgent();
    userModel.findByEmail.mockResolvedValue({ ...FAKE_USER, id: 'other-user-id' });
    const res = await agent.post('/account/profile').send({ email: 'taken@example.com' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/account');
    expect(userModel.updateProfile).not.toHaveBeenCalled();
  });
});

describe('POST /account/password', () => {
  test('redirects unauthenticated users to /login', async () => {
    const res = await request(app)
      .post('/account/password')
      .send({ currentPassword: 'old', newPassword: 'newpass1', confirmPassword: 'newpass1' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('changes password when current password is correct', async () => {
    userModel.updatePassword.mockResolvedValue(FAKE_USER);
    const agent = await loginAgent();

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 1);
    userModel.findById.mockResolvedValue({ ...FAKE_USER, password: hashedPassword });

    const res = await agent
      .post('/account/password')
      .send({ currentPassword: 'password123', newPassword: 'newpassword1', confirmPassword: 'newpassword1' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/account');
    expect(userModel.updatePassword).toHaveBeenCalledWith(FAKE_USER.id, 'newpassword1');
  });

  test('flashes error when current password is incorrect', async () => {
    const agent = await loginAgent();

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('correct-password', 1);
    userModel.findById.mockResolvedValue({ ...FAKE_USER, password: hashedPassword });

    const res = await agent
      .post('/account/password')
      .send({ currentPassword: 'wrong-password', newPassword: 'newpassword1', confirmPassword: 'newpassword1' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/account');
    expect(userModel.updatePassword).not.toHaveBeenCalled();
  });

  test('flashes error when new passwords do not match', async () => {
    const agent = await loginAgent();
    const res = await agent
      .post('/account/password')
      .send({ currentPassword: 'password123', newPassword: 'newpass1', confirmPassword: 'different' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/account');
    expect(userModel.updatePassword).not.toHaveBeenCalled();
  });

  test('flashes error when new password is too short', async () => {
    const agent = await loginAgent();
    const res = await agent
      .post('/account/password')
      .send({ currentPassword: 'password123', newPassword: 'short', confirmPassword: 'short' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/account');
    expect(userModel.updatePassword).not.toHaveBeenCalled();
  });

  test('flashes error when fields are missing', async () => {
    const agent = await loginAgent();
    const res = await agent.post('/account/password').send({ currentPassword: 'password123' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/account');
    expect(userModel.updatePassword).not.toHaveBeenCalled();
  });
});
