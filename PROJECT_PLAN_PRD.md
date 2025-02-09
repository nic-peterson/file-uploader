# Project Plan & PRD (File Uploader)

**Last Updated**: (Feb/09/2025)

This document outlines the project requirements, technical architecture, and timeline for the File Uploader project. For a quick start guide, see [README.md](./README.md).

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technical Architecture](#technical-architecture)
3. [Core Features (MVP)](#core-features-mvp)
4. [Database Schema](#database-schema)
5. [Project Plan (10 Weeks)](#project-plan-10-weeks)
6. [Realistic Timeline for Beginners](#realistic-timeline-for-beginners)
7. [Learning Resources](#learning-resources)
8. [Common Beginner Pitfalls & Solutions](#common-beginner-pitfalls--solutions)

---

## Project Overview

This project aims to provide a **beginner-friendly** application where users can:

- Sign up, log in, and maintain authenticated sessions.
- Upload and organize files (images, documents, etc.) in Supabase storage.
- Manage folder structures to keep files organized.
- Use PostgreSQL (with Prisma) to store file metadata and user information.

---

## Technical Architecture

```
[Frontend: HTML/CSS/JS] ↔ [Express.js] ↔ [PostgreSQL (via Prisma)]
                              │
                              ├── Auth (PassportJS)
                              ├── File Storage (Supabase)
                              └── ORM (Prisma)

```

1. **Frontend**:

   - Basic HTML/CSS/JS forms and pages.
   - AJAX/Fetch to interact with the Express API.

2. **Express Server**:

   - Handles routes for authentication, file management, and folder system.
   - Implements session-based auth with PassportJS.
   - Uses Prisma to interact with PostgreSQL.

3. **PostgreSQL (via Prisma)**:

   - Stores user data, file metadata (name, URL, size, etc.), and folder structures.

4. **Supabase**:
   - Manages the actual file storage.
   - Returns publicly accessible (or signed) file URLs that are referenced in the DB.

---

## Core Features (MVP)

1. **User Authentication**

   - Sign up / login with email and password.
   - Session-based authentication using PassportJS and express-session.

2. **File Upload**

   - Single file uploads (max ~25MB) to Supabase.
   - File metadata (names, sizes, creation dates) stored in PostgreSQL via Prisma.

3. **Basic Folder System**
   - Create or delete folders.
   - Organize files into folders for each user.

---

## Database Schema

```prisma
model User {
  id       String   @id @default(uuid())
  email    String   @unique
  password String
  files    File[]
  folders  Folder[]
}

model File {
  id        String   @id @default(uuid())
  name      String
  url       String
  size      Int
  userId    String
  folderId  String?
  folder    Folder?  @relation(fields: [folderId], references: [id])
  createdAt DateTime @default(now())
}

model Folder {
  id        String   @id @default(uuid())
  name      String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  files     File[]
  createdAt DateTime @default(now())
}
```

- User: One-to-many relationship with both files and folders.
- File: Belongs to a user; optionally belongs to a folder.
- Folder: Belongs to a user; can contain multiple files.

---

## Project Plan (10 Weeks)

### Phase 1: Setup & Authentication (Week 1-3)

| Milestone           | Tasks                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Project Setup**   | 1. Initialize Express app<br>2. Set up PostgreSQL database<br>3. Configure Prisma ORM<br>4. Install necessary dependencies |
| **PassportJS Auth** | 1. Implement local strategy<br>2. Create signup/login routes<br>3. Set up session middleware<br>4. Create basic auth views |

### Phase 2: File Management (Week 4-6)

| Milestone          | Tasks                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Supabase Setup** | 1. Create Supabase project<br>2. Configure storage bucket<br>3. Install Supabase JS client                       |
| **File Upload**    | 1. Create upload form<br>2. Implement file upload to Supabase<br>3. Store file metadata in PostgreSQL via Prisma |
| **File Listing**   | 1. Fetch user files from DB<br>2. Display in table<br>3. Implement file deletion                                 |

### Phase 3: Folder System (Week 7-8)

| Milestone             | Tasks                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Folder CRUD**       | 1. Implement create/delete folder functionality<br>2. Update file schema to include folder relationship<br>3. Create folder views |
| **File Organization** | 1. Allow moving files between folders<br>2. Update file listing to show folder structure                                          |

### Phase 4: Polish and Deployment (Week 9-10)

| Milestone           | Tasks                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------- |
| **Error Handling**  | 1. Implement proper error handling throughout the app<br>2. Add user-friendly error messages |
| **UI Improvements** | 1. Enhance dashboard layout<br>2. Implement responsive design                                |
| **Deployment**      | 1. Set up production database<br>2. Deploy to Heroku or similar platform                     |

## Realistic Timeline for Beginners

| Week | Focus Area      | Time Commitment |
| ---- | --------------- | --------------- |
| 1-3  | Auth Setup      | 12-15 hours     |
| 4-6  | File Management | 15-18 hours     |
| 7-8  | Folder System   | 10-12 hours     |
| 9-10 | Polish & Deploy | 8-10 hours      |

---

## Learning Resources

1. [PassportJS Documentation](http://www.passportjs.org/docs/)
2. [Prisma Getting Started](https://www.prisma.io/docs/getting-started)
3. [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
4. [Express.js Guide](https://expressjs.com/en/guide/routing.html)

---

## Common Beginner Pitfalls & Solutions

1. **Database Connection Issues**

   - Fix: Double-check your database URL in the Prisma schema

2. **PassportJS Session Handling**

   - Fix: Ensure you're using express-session correctly with PassportJS

3. **Prisma Schema Migrations**

   - Fix: Run `prisma migrate dev` after schema changes

4. **Supabase Storage Permissions**
   - Fix: Configure bucket policies in Supabase dashboard

---

### Need a Quick Start?

Please see [README.md](./README.md) for installation steps, environment variable configuration, and usage instructions.

---

### How to Use These Files

1. **Save** both files (`README.md` and `PROJECT_PLAN_PRD.md`) in the root of your repository.
2. **Reference** the PRD (`PROJECT_PLAN_PRD.md`) for project planning, milestones, and the technical roadmap.
3. **Use** the `README.md` to guide contributors, testers, or new developers on how to install and run your application.

With this setup, you’ll have a well-organized structure for both new developers exploring your project (via the README) and for anyone who needs deeper insight into your requirements and planned development process (the PRD).
