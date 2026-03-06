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

const FAKE_FOLDER = {
  id: 'folder-uuid-1',
  name: 'My Folder',
  userId: 'uuid-test-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { files: 0 },
};

const FAKE_FILE = {
  id: 'file-uuid-1',
  name: 'test.txt',
  type: 'text/plain',
  size: 1024,
  url: 'https://test.supabase.co/object/public/test-bucket/uuid-test-1/test-file.txt',
  userId: 'uuid-test-1',
  folderId: 'folder-uuid-1',
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
  fileModel.getRootFiles.mockResolvedValue([]);
  fileModel.countRootFiles.mockResolvedValue(0);
  fileModel.getFilesInFolder.mockResolvedValue([]);
  fileModel.countFilesInFolder.mockResolvedValue(0);
  folderModel.getFoldersByUser.mockResolvedValue([]);
});

describe('GET /dashboard', () => {
  test('calls getFoldersByUser and getRootFiles when authenticated', async () => {
    folderModel.getFoldersByUser.mockResolvedValue([FAKE_FOLDER]);
    fileModel.getRootFiles.mockResolvedValue([FAKE_FILE]);
    fileModel.countRootFiles.mockResolvedValue(1);
    const agent = await loginAgent();

    const res = await agent.get('/dashboard');
    expect(res.status).toBe(200);
    expect(folderModel.getFoldersByUser).toHaveBeenCalledWith(FAKE_USER.id);
    expect(fileModel.getRootFiles).toHaveBeenCalledWith(FAKE_USER.id, expect.objectContaining({ skip: 0 }));
  });

  test('GET /dashboard?view=flat returns 200', async () => {
    const agent = await loginAgent();
    const res = await agent.get('/dashboard?view=flat');
    expect(res.status).toBe(200);
  });
});

describe('GET /folders/:id', () => {
  test('redirects unauthenticated users to /login', async () => {
    const res = await request(app).get('/folders/folder-uuid-1');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('renders folder view for owner', async () => {
    folderModel.getFolderById.mockResolvedValue(FAKE_FOLDER);
    fileModel.getFilesInFolder.mockResolvedValue([FAKE_FILE]);
    folderModel.getFoldersByUser.mockResolvedValue([FAKE_FOLDER]);
    const agent = await loginAgent();

    const res = await agent.get(`/folders/${FAKE_FOLDER.id}`);
    expect(res.status).toBe(200);
    expect(folderModel.getFolderById).toHaveBeenCalledWith(FAKE_FOLDER.id);
  });

  test('redirects to /dashboard when folder not found', async () => {
    folderModel.getFolderById.mockResolvedValue(null);
    const agent = await loginAgent();

    const res = await agent.get('/folders/nonexistent-id');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
  });

  test('redirects to /dashboard when user does not own folder', async () => {
    folderModel.getFolderById.mockResolvedValue({ ...FAKE_FOLDER, userId: 'other-user-id' });
    const agent = await loginAgent();

    const res = await agent.get(`/folders/${FAKE_FOLDER.id}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
  });
});

describe('POST /folders', () => {
  test('redirects unauthenticated users to /login', async () => {
    const res = await request(app).post('/folders').send({ name: 'New Folder' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('creates folder and redirects to /dashboard', async () => {
    folderModel.createFolder.mockResolvedValue(FAKE_FOLDER);
    const agent = await loginAgent();

    const res = await agent.post('/folders').send({ name: 'New Folder' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
    expect(folderModel.createFolder).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Folder', userId: FAKE_USER.id })
    );
  });

  test('flashes error and redirects when name is missing', async () => {
    const agent = await loginAgent();

    const res = await agent.post('/folders').send({ name: '' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
    expect(folderModel.createFolder).not.toHaveBeenCalled();
  });
});

describe('POST /folders/:id/rename', () => {
  test('renames folder for owner and redirects', async () => {
    folderModel.getFolderById.mockResolvedValue(FAKE_FOLDER);
    folderModel.updateFolder.mockResolvedValue({ ...FAKE_FOLDER, name: 'Renamed' });
    const agent = await loginAgent();

    const res = await agent.post(`/folders/${FAKE_FOLDER.id}/rename`).send({ name: 'Renamed' });
    expect(res.status).toBe(302);
    expect(folderModel.updateFolder).toHaveBeenCalledWith(
      FAKE_FOLDER.id,
      expect.objectContaining({ name: 'Renamed' })
    );
  });

  test('flashes error and redirects when user does not own folder', async () => {
    folderModel.getFolderById.mockResolvedValue({ ...FAKE_FOLDER, userId: 'other-user-id' });
    const agent = await loginAgent();

    const res = await agent.post(`/folders/${FAKE_FOLDER.id}/rename`).send({ name: 'Renamed' });
    expect(res.status).toBe(302);
    expect(folderModel.updateFolder).not.toHaveBeenCalled();
  });
});

describe('POST /folders/:id/delete', () => {
  test('deletes folder for owner and redirects to /dashboard', async () => {
    folderModel.getFolderById.mockResolvedValue(FAKE_FOLDER);
    folderModel.deleteFolder.mockResolvedValue(FAKE_FOLDER);
    const agent = await loginAgent();

    const res = await agent.post(`/folders/${FAKE_FOLDER.id}/delete`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
    expect(folderModel.deleteFolder).toHaveBeenCalledWith(FAKE_FOLDER.id);
  });

  test('flashes error and redirects when user does not own folder', async () => {
    folderModel.getFolderById.mockResolvedValue({ ...FAKE_FOLDER, userId: 'other-user-id' });
    const agent = await loginAgent();

    const res = await agent.post(`/folders/${FAKE_FOLDER.id}/delete`);
    expect(res.status).toBe(302);
    expect(folderModel.deleteFolder).not.toHaveBeenCalled();
  });
});

describe('POST /files/:id/move', () => {
  test('moves file for owner and redirects', async () => {
    fileModel.getFileById.mockResolvedValue(FAKE_FILE);
    fileModel.moveFile.mockResolvedValue({ ...FAKE_FILE, folderId: null });
    const agent = await loginAgent();

    const res = await agent
      .post(`/files/${FAKE_FILE.id}/move`)
      .send({ folderId: '' });
    expect(res.status).toBe(302);
    expect(fileModel.moveFile).toHaveBeenCalledWith(FAKE_FILE.id, null);
  });

  test('flashes error and redirects when user does not own file', async () => {
    fileModel.getFileById.mockResolvedValue({ ...FAKE_FILE, userId: 'other-user-id' });
    const agent = await loginAgent();

    const res = await agent
      .post(`/files/${FAKE_FILE.id}/move`)
      .send({ folderId: 'folder-uuid-1' });
    expect(res.status).toBe(302);
    expect(fileModel.moveFile).not.toHaveBeenCalled();
  });
});
