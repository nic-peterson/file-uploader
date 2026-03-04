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
jest.mock('../src/config/supabase', () => ({
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://test.supabase.co/object/public/test-bucket/user-id/test-file.txt' } }),
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

const FAKE_FILE = {
  id: 'file-uuid-1',
  name: 'test.txt',
  type: 'text/plain',
  size: 1024,
  url: 'https://test.supabase.co/object/public/test-bucket/uuid-test-1/test-file.txt',
  userId: 'uuid-test-1',
  createdAt: new Date(),
  updatedAt: new Date(),
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

describe('GET /dashboard', () => {
  test('redirects unauthenticated users to /login', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('renders dashboard for authenticated users and calls getFilesByUser and getFoldersByUser', async () => {
    fileModel.getFilesByUser.mockResolvedValue([FAKE_FILE]);
    folderModel.getFoldersByUser.mockResolvedValue([]);
    const agent = await loginAgent();

    const res = await agent.get('/dashboard');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Welcome');
    expect(fileModel.getFilesByUser).toHaveBeenCalledWith(FAKE_USER.id);
    expect(folderModel.getFoldersByUser).toHaveBeenCalledWith(FAKE_USER.id);
  });
});

describe('POST /files/upload', () => {
  test('redirects unauthenticated users to /login', async () => {
    const res = await request(app)
      .post('/files/upload')
      .attach('file', Buffer.from('hello'), 'test.txt');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('uploads file and redirects to /dashboard, calls createFile', async () => {
    fileModel.createFile.mockResolvedValue(FAKE_FILE);
    const agent = await loginAgent();

    const res = await agent
      .post('/files/upload')
      .attach('file', Buffer.from('hello world'), 'test.txt');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
    expect(fileModel.createFile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test.txt',
        userId: FAKE_USER.id,
      })
    );
  });

  test('flashes error and redirects when no file provided', async () => {
    const agent = await loginAgent();

    const res = await agent.post('/files/upload');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
    expect(fileModel.createFile).not.toHaveBeenCalled();
  });

  test('flashes error and redirects on MulterError (file too large)', async () => {
    const agent = await loginAgent();

    const largeBuffer = Buffer.alloc(26 * 1024 * 1024, 'a');
    const res = await agent
      .post('/files/upload')
      .attach('file', largeBuffer, 'large.txt');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
    expect(fileModel.createFile).not.toHaveBeenCalled();
  });
});

describe('POST /files/:id/delete', () => {
  test('redirects unauthenticated users to /login', async () => {
    const res = await request(app).post('/files/file-uuid-1/delete');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('deletes file owned by user and redirects to /dashboard', async () => {
    fileModel.getFileById.mockResolvedValue(FAKE_FILE);
    fileModel.deleteFile.mockResolvedValue(FAKE_FILE);
    const agent = await loginAgent();

    const res = await agent.post(`/files/${FAKE_FILE.id}/delete`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
    expect(fileModel.deleteFile).toHaveBeenCalledWith(FAKE_FILE.id);
  });

  test('flashes error when file not found', async () => {
    fileModel.getFileById.mockResolvedValue(null);
    const agent = await loginAgent();

    const res = await agent.post('/files/nonexistent-id/delete');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
    expect(fileModel.deleteFile).not.toHaveBeenCalled();
  });

  test('flashes error when user does not own file', async () => {
    const otherUserFile = { ...FAKE_FILE, userId: 'other-user-id' };
    fileModel.getFileById.mockResolvedValue(otherUserFile);
    const agent = await loginAgent();

    const res = await agent.post(`/files/${FAKE_FILE.id}/delete`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
    expect(fileModel.deleteFile).not.toHaveBeenCalled();
  });
});
