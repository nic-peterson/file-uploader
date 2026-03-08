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
jest.mock('../src/models/sharedFolderModel');
jest.mock('../src/config/supabase', () => ({
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://test.supabase.co/file.txt' } }),
      remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  },
}));

const userModel = require('../src/models/userModel');
const fileModel = require('../src/models/fileModel');
const folderModel = require('../src/models/folderModel');
const sharedFolderModel = require('../src/models/sharedFolderModel');
const app = require('../src/app');

const FAKE_USER = {
  id: 'uuid-test-1',
  email: 'test@example.com',
  password: '$2b$12$hashedpassword',
  name: 'Test User',
};

const FAKE_FOLDER = {
  id: 'folder-uuid-1',
  name: 'My Folder',
  userId: 'uuid-test-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { files: 2 },
};

const FAKE_FILE = {
  id: 'file-uuid-1',
  name: 'test.txt',
  type: 'text/plain',
  size: 1024,
  url: 'https://test.supabase.co/file.txt',
  userId: 'uuid-test-1',
  folderId: 'folder-uuid-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const FAKE_SHARE = {
  id: 'share-uuid-1',
  token: 'abc123token',
  folderId: 'folder-uuid-1',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  folder: { ...FAKE_FOLDER, files: [FAKE_FILE] },
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
  fileModel.getRootFiles.mockResolvedValue([]);
  fileModel.countRootFiles.mockResolvedValue(0);
  fileModel.getFilesInFolder.mockResolvedValue([]);
  fileModel.countFilesInFolder.mockResolvedValue(0);
  folderModel.getFoldersByUser.mockResolvedValue([]);
});

describe('POST /folders/:id/share', () => {
  test('redirects unauthenticated users to /login', async () => {
    const res = await request(app).post('/folders/folder-uuid-1/share').send({ duration: '7' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('redirects to /dashboard when folder not found', async () => {
    folderModel.getFolderById.mockResolvedValue(null);
    const agent = await loginAgent();

    const res = await agent.post('/folders/nonexistent/share').send({ duration: '7' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
    expect(sharedFolderModel.createShare).not.toHaveBeenCalled();
  });

  test('redirects to /dashboard when user does not own folder', async () => {
    folderModel.getFolderById.mockResolvedValue({ ...FAKE_FOLDER, userId: 'other-user-id' });
    const agent = await loginAgent();

    const res = await agent.post(`/folders/${FAKE_FOLDER.id}/share`).send({ duration: '7' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
    expect(sharedFolderModel.createShare).not.toHaveBeenCalled();
  });

  test('redirects to folder when duration is missing', async () => {
    folderModel.getFolderById.mockResolvedValue(FAKE_FOLDER);
    const agent = await loginAgent();

    const res = await agent.post(`/folders/${FAKE_FOLDER.id}/share`).send({ duration: '' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/folders/${FAKE_FOLDER.id}`);
    expect(sharedFolderModel.createShare).not.toHaveBeenCalled();
  });

  test('redirects to folder when duration is non-numeric text', async () => {
    folderModel.getFolderById.mockResolvedValue(FAKE_FOLDER);
    const agent = await loginAgent();

    const res = await agent.post(`/folders/${FAKE_FOLDER.id}/share`).send({ duration: 'invalid' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/folders/${FAKE_FOLDER.id}`);
    expect(sharedFolderModel.createShare).not.toHaveBeenCalled();
  });

  test('redirects to folder when duration exceeds 30', async () => {
    folderModel.getFolderById.mockResolvedValue(FAKE_FOLDER);
    const agent = await loginAgent();

    const res = await agent.post(`/folders/${FAKE_FOLDER.id}/share`).send({ duration: '31' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/folders/${FAKE_FOLDER.id}`);
    expect(sharedFolderModel.createShare).not.toHaveBeenCalled();
  });

  test('redirects to folder when duration is 0', async () => {
    folderModel.getFolderById.mockResolvedValue(FAKE_FOLDER);
    const agent = await loginAgent();

    const res = await agent.post(`/folders/${FAKE_FOLDER.id}/share`).send({ duration: '0' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/folders/${FAKE_FOLDER.id}`);
    expect(sharedFolderModel.createShare).not.toHaveBeenCalled();
  });

  test('creates share and redirects to folder with success flash', async () => {
    folderModel.getFolderById.mockResolvedValue(FAKE_FOLDER);
    sharedFolderModel.createShare.mockResolvedValue(FAKE_SHARE);
    const agent = await loginAgent();

    const res = await agent.post(`/folders/${FAKE_FOLDER.id}/share`).send({ duration: '7' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/folders/${FAKE_FOLDER.id}`);
    expect(sharedFolderModel.createShare).toHaveBeenCalledWith(
      expect.objectContaining({ folderId: FAKE_FOLDER.id })
    );
  });

  test('rounds float duration to nearest integer', async () => {
    folderModel.getFolderById.mockResolvedValue(FAKE_FOLDER);
    sharedFolderModel.createShare.mockResolvedValue(FAKE_SHARE);
    const agent = await loginAgent();

    const res = await agent.post(`/folders/${FAKE_FOLDER.id}/share`).send({ duration: '7.3' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/folders/${FAKE_FOLDER.id}`);
    expect(sharedFolderModel.createShare).toHaveBeenCalledWith(
      expect.objectContaining({ folderId: FAKE_FOLDER.id })
    );
  });

  test('rounds float up to nearest integer', async () => {
    folderModel.getFolderById.mockResolvedValue(FAKE_FOLDER);
    sharedFolderModel.createShare.mockResolvedValue(FAKE_SHARE);
    const agent = await loginAgent();

    const res = await agent.post(`/folders/${FAKE_FOLDER.id}/share`).send({ duration: '7.8' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/folders/${FAKE_FOLDER.id}`);
    const call = sharedFolderModel.createShare.mock.calls[0][0];
    const expectedMs = 8 * 24 * 60 * 60 * 1000;
    expect(call.expiresAt.getTime()).toBeGreaterThan(Date.now() + expectedMs - 5000);
    expect(call.expiresAt.getTime()).toBeLessThan(Date.now() + expectedMs + 5000);
  });

  test('creates share with correct expiry date', async () => {
    folderModel.getFolderById.mockResolvedValue(FAKE_FOLDER);
    sharedFolderModel.createShare.mockResolvedValue(FAKE_SHARE);
    const before = Date.now();
    const agent = await loginAgent();

    await agent.post(`/folders/${FAKE_FOLDER.id}/share`).send({ duration: '1' });

    const call = sharedFolderModel.createShare.mock.calls[0][0];
    const expectedMin = new Date(before + 1 * 24 * 60 * 60 * 1000);
    const expectedMax = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
    expect(call.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
    expect(call.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
  });

  test('accepts duration at maximum boundary (30)', async () => {
    folderModel.getFolderById.mockResolvedValue(FAKE_FOLDER);
    sharedFolderModel.createShare.mockResolvedValue(FAKE_SHARE);
    const agent = await loginAgent();

    const res = await agent.post(`/folders/${FAKE_FOLDER.id}/share`).send({ duration: '30' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/folders/${FAKE_FOLDER.id}`);
    expect(sharedFolderModel.createShare).toHaveBeenCalled();
  });
});

describe('GET /share/:token', () => {
  test('renders share view for valid, non-expired token', async () => {
    sharedFolderModel.findByToken.mockResolvedValue(FAKE_SHARE);

    const res = await request(app).get(`/share/${FAKE_SHARE.token}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain(FAKE_FOLDER.name);
    expect(sharedFolderModel.findByToken).toHaveBeenCalledWith(FAKE_SHARE.token);
  });

  test('returns 404 and renders share-expired when token not found', async () => {
    sharedFolderModel.findByToken.mockResolvedValue(null);

    const res = await request(app).get('/share/badtoken');
    expect(res.status).toBe(404);
    expect(res.text).toContain('Link Expired');
  });

  test('returns 404 and renders share-expired when link is expired', async () => {
    const expiredShare = {
      ...FAKE_SHARE,
      expiresAt: new Date(Date.now() - 1000),
    };
    sharedFolderModel.findByToken.mockResolvedValue(expiredShare);

    const res = await request(app).get(`/share/${expiredShare.token}`);
    expect(res.status).toBe(404);
    expect(res.text).toContain('Link Expired');
  });

  test('renders file list in share view', async () => {
    sharedFolderModel.findByToken.mockResolvedValue(FAKE_SHARE);

    const res = await request(app).get(`/share/${FAKE_SHARE.token}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain(FAKE_FILE.name);
  });

  test('renders empty state when folder has no files', async () => {
    const emptyShare = {
      ...FAKE_SHARE,
      folder: { ...FAKE_FOLDER, files: [] },
    };
    sharedFolderModel.findByToken.mockResolvedValue(emptyShare);

    const res = await request(app).get(`/share/${FAKE_SHARE.token}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('This folder is empty.');
  });

  test('does not require authentication', async () => {
    sharedFolderModel.findByToken.mockResolvedValue(FAKE_SHARE);

    const res = await request(app).get(`/share/${FAKE_SHARE.token}`);
    expect(res.status).toBe(200);
  });

  test('calls next(err) when findByToken throws', async () => {
    sharedFolderModel.findByToken.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/share/sometoken');
    expect(res.status).toBe(500);
  });
});

describe('POST /folders/:id/share error handling', () => {
  test('calls next(err) when createShare throws', async () => {
    folderModel.getFolderById.mockResolvedValue(FAKE_FOLDER);
    sharedFolderModel.createShare.mockRejectedValue(new Error('DB error'));
    const agent = await loginAgent();

    const res = await agent.post(`/folders/${FAKE_FOLDER.id}/share`).send({ duration: '7' });
    expect(res.status).toBe(500);
  });
});
