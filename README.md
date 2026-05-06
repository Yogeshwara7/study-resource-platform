# Study Resource Sharing Platform

A platform for students to upload, share, and download study materials.

## Demo Credentials
| Role    | Email            | Password    |
|---------|------------------|-------------|
| Admin   | admin@demo.com   | Admin@123   |
| Student | student@demo.com | Student@123 |

---

## Run Locally

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd study-resource-platform
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Supabase
- Create a free account at [supabase.com](https://supabase.com)
- Create a new project
- Go to **SQL Editor** → paste and run `setup.sql`
- Go to **Storage** → New bucket → name: `study-files` → enable Public → Create
- Go to **Settings → API** → copy your Project URL, anon key, and service role key

### 4. Add your Supabase keys
Open `public/app.js` and update:
```js
const SUPABASE_URL = 'your_project_url';
const SUPABASE_KEY = 'your_anon_key';
```

Create a `.env` file in the root:
```
PORT=3003
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_KEY=your_service_role_key
```

### 5. Start the app
```bash
npm start
```
Open [http://localhost:3003](http://localhost:3003)

---

## Deploy on Render
1. Push this folder as a GitHub repo
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo
4. Set build command: `npm install`
5. Set start command: `node server.js`
6. Add environment variables in Render dashboard:
   - `SUPABASE_URL` → your Supabase project URL
   - `SUPABASE_SERVICE_KEY` → your Supabase service role key

---

## Features
- User registration and login
- Upload PDFs, notes, or external links with title, subject, description
- Browse and download resources
- Search by keyword or filter by subject and type
- Download counter per resource
- Admin panel — manage users and resources
