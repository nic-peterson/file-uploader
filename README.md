# File Uploader Project

A beginner-friendly Node.js application featuring user authentication, file uploads via Supabase, and basic folder management with PostgreSQL (via Prisma).

Project authored by The Odin Project outlined [[here]](https://www.theodinproject.com/lessons/nodejs-file-uploader).

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [Installation & Setup](#installation--setup)
5. [Usage](#usage)
6. [Folder Structure](#folder-structure)
7. [Contributing](#contributing)
8. [License](#license)
9. [Additional Resources](#additional-resources)

---

## Overview

This project allows users to:

- Sign up and log in using PassportJS with session-based authentication.
- Upload single files (max ~25MB) to a Supabase storage bucket.
- Organize files into folders, with file metadata stored in a PostgreSQL database.
- Perform basic file and folder operations (create, list, delete).

**Want more details?** See [PROJECT_PLAN_PRD.md](./PROJECT_PLAN_PRD.md) for a full roadmap and technical breakdown.

---

## Key Features

- **User Authentication**: Secure sign-up and login with email/password using [PassportJS](http://www.passportjs.org/).
- **File Upload**: Upload files to [Supabase](https://supabase.com/) Storage; store metadata in PostgreSQL.
- **Folder Management**: Create/delete folders and organize files accordingly.
- **Responsive Frontend**: Basic HTML/CSS/JS front end with route handling in Express.

---

## Tech Stack

- **Node.js / Express** for server and route handling.
- **PostgreSQL** as the relational database.
- **Prisma** as the ORM to simplify database operations.
- **PassportJS** for user authentication and session management.
- **Supabase** for file storage (via the official `@supabase/supabase-js` package).
- **HTML/CSS/Vanilla JS** for a straightforward frontend.
- **Multer** for handling file uploads before sending to Supabase.

---

## Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/file-uploader-project.git
   cd file-uploader-project
   ```
2. **Install Dependencies**
   ```bash
   npm install
   # or
   yarn
   ```
3. **Create .env File**

   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/your_db"
   SUPABASE_URL="your_supabase_project_url"
   SUPABASE_ANON_KEY="your_supabase_anon_key"
   SESSION_SECRET="your_random_string_for_sessions"
   # ...add any other environment variables as needed
   ```

4. **Initialize Prisma**

   ```bash
   npx prisma migrate dev
   # or
   npx prisma db push
   ```

5. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000 (or specified port) to access the application.

## Usage

1. Sign Up / Login

- Access the sign-up page at /signup and login page at /login.

2. Upload Files

- Navigate to the upload page, select a file, and submit.
- The file is stored in Supabase, and metadata is stored in PostgreSQL.

3. Manage Folders

- Create new folders to keep your files organized.
- Move or delete files and folders as needed.

## Folder Structure

```
file-uploader-project/
├── __tests__/              # Test files
│   ├── unit/
│   └── integration/
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── fileController.js
│   │   └── folderController.js
│   ├── models/
│   │   ├── userModel.js
│   │   ├── fileModel.js
│   │   └── folderModel.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── fileRoutes.js
│   │   └── folderRoutes.js
│   └── views/
│       ├── index.ejs
│       ├── login.ejs
│       ├── signup.ejs
│       └── ...
├── prisma/
│   ├── schema.prisma        # Your Prisma schema
│   └── migrations/          # Auto-generated migrations
├── PROJECT_PLAN_PRD.md
├── README.md
├── package.json
└── .env                     # Not committed to version control
```

## Contributing

1. Fork the project.
2. Create a feature branch: git checkout -b feat-amazing-feature.
3. Commit changes: git commit -m "feat: add some amazing feature".
4. Push to your branch: git push origin feat-amazing-feature.
5. Open a Pull Request against the main branch.

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT). Feel free to modify or distribute as needed.

## Additional Resources

- [PassportJS Documentation](http://www.passportjs.org/docs/)
- [Prisma Getting Started](https://www.prisma.io/docs/getting-started)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
