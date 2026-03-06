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
const passwordResetModel = require('../src/models/passwordResetModel');
const app = require('../src/app');

const FAKE_USER = {
  id: 'uuid-test-1',
  email: 'test@example.com',
  password: '$2b$12$hashedpassword',
  name: 'Test User',
};

const VALID_TOKEN = 'a'.repeat(64);
const FAKE_TOKEN_RECORD = {
  id: 'token-uuid-1',
  token: VALID_TOKEN,
  userId: FAKE_USER.id,
  user: FAKE_USER,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
};

beforeEach(() => {
  jest.clearAllMocks();
  fileModel.getRootFiles.mockResolvedValue([]);
  fileModel.countRootFiles.mockResolvedValue(0);
  folderModel.getFoldersByUser.mockResolvedValue([]);
});

describe('GET /forgot-password', () => {
  test('renders the forgot password form', async () => {
    const res = await request(app).get('/forgot-password');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Forgot Password');
    expect(res.text).toContain('Send Reset Link');
  });
});

describe('POST /forgot-password', () => {
  test('redirects with success flash when email belongs to a registered user', async () => {
    userModel.findByEmail.mockResolvedValue(FAKE_USER);
    passwordResetModel.createToken.mockResolvedValue(FAKE_TOKEN_RECORD);

    const res = await request(app).post('/forgot-password').send({ email: 'test@example.com' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/forgot-password');
    expect(passwordResetModel.createToken).toHaveBeenCalledWith(
      FAKE_USER.id,
      expect.any(String),
      expect.any(Date)
    );
  });

  test('redirects with success flash even when email is not registered (no enumeration)', async () => {
    userModel.findByEmail.mockResolvedValue(null);

    const res = await request(app).post('/forgot-password').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/forgot-password');
    expect(passwordResetModel.createToken).not.toHaveBeenCalled();
  });

  test('redirects with error flash when email is missing', async () => {
    const res = await request(app).post('/forgot-password').send({});
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/forgot-password');
    expect(passwordResetModel.createToken).not.toHaveBeenCalled();
  });
});

describe('GET /reset-password/:token', () => {
  test('renders reset form for a valid, unexpired token', async () => {
    passwordResetModel.findByToken.mockResolvedValue(FAKE_TOKEN_RECORD);

    const res = await request(app).get(`/reset-password/${VALID_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Reset Password');
    expect(res.text).toContain('Set New Password');
  });

  test('redirects to /forgot-password for an expired token', async () => {
    passwordResetModel.findByToken.mockResolvedValue({
      ...FAKE_TOKEN_RECORD,
      expiresAt: new Date(Date.now() - 1000), // expired
    });

    const res = await request(app).get(`/reset-password/${VALID_TOKEN}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/forgot-password');
  });

  test('redirects to /forgot-password for an invalid (not found) token', async () => {
    passwordResetModel.findByToken.mockResolvedValue(null);

    const res = await request(app).get('/reset-password/invalid-token');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/forgot-password');
  });
});

describe('POST /reset-password/:token', () => {
  test('updates password and redirects to /login on success', async () => {
    passwordResetModel.findByToken.mockResolvedValue(FAKE_TOKEN_RECORD);
    userModel.updatePassword.mockResolvedValue(FAKE_USER);
    passwordResetModel.deleteByToken.mockResolvedValue(FAKE_TOKEN_RECORD);

    const res = await request(app)
      .post(`/reset-password/${VALID_TOKEN}`)
      .send({ newPassword: 'newpassword1', confirmPassword: 'newpassword1' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
    expect(userModel.updatePassword).toHaveBeenCalledWith(FAKE_USER.id, 'newpassword1');
    expect(passwordResetModel.deleteByToken).toHaveBeenCalledWith(VALID_TOKEN);
  });

  test('redirects to /forgot-password when token is expired', async () => {
    passwordResetModel.findByToken.mockResolvedValue({
      ...FAKE_TOKEN_RECORD,
      expiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app)
      .post(`/reset-password/${VALID_TOKEN}`)
      .send({ newPassword: 'newpassword1', confirmPassword: 'newpassword1' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/forgot-password');
    expect(userModel.updatePassword).not.toHaveBeenCalled();
  });

  test('redirects to /forgot-password when token is invalid', async () => {
    passwordResetModel.findByToken.mockResolvedValue(null);

    const res = await request(app)
      .post('/reset-password/bad-token')
      .send({ newPassword: 'newpassword1', confirmPassword: 'newpassword1' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/forgot-password');
    expect(userModel.updatePassword).not.toHaveBeenCalled();
  });

  test('flashes error and redirects back when passwords do not match', async () => {
    const res = await request(app)
      .post(`/reset-password/${VALID_TOKEN}`)
      .send({ newPassword: 'newpassword1', confirmPassword: 'differentpassword' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/reset-password/${VALID_TOKEN}`);
    expect(userModel.updatePassword).not.toHaveBeenCalled();
  });

  test('flashes error and redirects back when password is too short', async () => {
    const res = await request(app)
      .post(`/reset-password/${VALID_TOKEN}`)
      .send({ newPassword: 'short', confirmPassword: 'short' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/reset-password/${VALID_TOKEN}`);
    expect(userModel.updatePassword).not.toHaveBeenCalled();
  });

  test('flashes error and redirects back when fields are missing', async () => {
    const res = await request(app)
      .post(`/reset-password/${VALID_TOKEN}`)
      .send({ newPassword: 'newpassword1' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/reset-password/${VALID_TOKEN}`);
    expect(userModel.updatePassword).not.toHaveBeenCalled();
  });
});
