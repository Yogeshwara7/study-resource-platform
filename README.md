# Study Resource Sharing Platform

A secure platform for students to upload, share, and download study materials with OAuth authentication and admin controls.

## ✨ Features

### User Features
- **Authentication:**
  - Email/password registration and login
  - Google OAuth integration
  - Auto-login after registration (no email verification)
  - Secure session management

- **Resource Management:**
  - Upload PDFs, documents, notes, or external links
  - Add title, subject, and description
  - File size validation (5MB max)
  - Download tracking

- **Browse & Search:**
  - View all available resources
  - Search by keyword
  - Filter by subject and type
  - Pagination (12 items per page)
  - Refresh button for latest content

- **User Actions:**
  - Delete own resources
  - Track download counts
  - View uploader information

### Admin Features
- **User Management:**
  - View all registered users
  - Delete user accounts
  - Monitor user activity

- **Content Moderation:**
  - View all uploaded resources
  - Delete inappropriate content
  - Access via dedicated admin panel

- **Security:**
  - Row Level Security (RLS) policies
  - Admin role verification via JWT
  - Service role API for admin operations

## 🔒 Security Features

- **Environment Variables:** Supabase keys served securely via backend API
- **RLS Policies:** Database-level access control
- **Admin Authorization:** `(auth.uid() = posted_by) OR ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')`
- **File Validation:** Size and type restrictions
- **Secure OAuth:** Google authentication with proper redirect handling

## Demo Credentials

| Role    | Email            | Password    |
|---------|------------------|-------------|
| Admin   | admin@demo.com   | Admin@123   |
| Student | student@demo.com | Student@123 |

**⚠️ Important:** Change or delete these accounts in production!

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd study-resource-platform
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Supabase

#### Create Project
1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be ready

#### Run Database Setup
1. Go to **SQL Editor** in Supabase dashboard
2. Copy and paste the contents of `setup.sql`
3. Click **Run**
4. This creates:
   - `resources` table with RLS policies
   - Demo admin and student accounts

#### Create Storage Bucket
1. Go to **Storage** in Supabase dashboard
2. Click **New bucket**
3. Name: `study-files`
4. Set to **Public**
5. Click **Create**

#### Get API Keys
1. Go to **Settings** → **API**
2. Copy:
   - Project URL
   - `anon` `public` key
   - `service_role` `secret` key

### 4. Configure Environment Variables

Create a `.env` file in the root directory:
```env
PORT=3003
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
```

**Note:** Use `.env.example` as a template

### 5. Set Up Google OAuth (Optional)

See detailed instructions in `OAUTH_SETUP.md`

Quick steps:
1. Create OAuth credentials in Google Cloud Console
2. Add redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. Enable Google provider in Supabase Authentication settings
4. Add Client ID and Client Secret

### 6. Start the Application
```bash
npm start
```

Open [http://localhost:3003](http://localhost:3003)

---

## 📚 Documentation

- **[OAUTH_SETUP.md](OAUTH_SETUP.md)** - Google OAuth configuration guide
- **[ADMIN_SETUP.md](ADMIN_SETUP.md)** - How to create and manage admin users
- **[RLS_POLICIES.md](RLS_POLICIES.md)** - Row Level Security policies explained

---

## 🛠️ Admin Setup

### Method 1: Admin Helper Tool (Easiest)
1. Navigate to `/admin-helper.html` in your browser
2. Enter your Supabase URL and service role key
3. Enter the user's email
4. Click "Grant Admin Role"
5. User must log out and log back in

### Method 2: Supabase Dashboard
1. Go to **Authentication** → **Users**
2. Click on the user
3. Edit **User Metadata**
4. Add: `{"role": "admin"}`
5. Save

### Method 3: SQL Query
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'user@example.com';
```

See `ADMIN_SETUP.md` for detailed instructions.

---

## 🌐 Deploy to Render

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Create Web Service on Render
1. Go to [render.com](https://render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name:** study-resource-platform
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`

### 3. Add Environment Variables
In Render dashboard, add:
- `SUPABASE_URL` → Your Supabase project URL
- `SUPABASE_ANON_KEY` → Your anon key
- `SUPABASE_SERVICE_KEY` → Your service role key

### 4. Update OAuth Redirect (if using Google OAuth)
Add your Render URL to Google OAuth authorized redirect URIs:
```
https://your-app.onrender.com/auth/callback
```

### 5. Deploy
Click **Create Web Service** and wait for deployment to complete.

---

## 🎨 UI Enhancements

- **Loading Indicators:** All buttons show spinner during operations
- **Pagination:** Browse page shows 12 items per page with navigation
- **Refresh Button:** Manually refresh resource list
- **File Validation:** 5MB max file size with user-friendly error messages
- **Responsive Design:** Works on desktop, tablet, and mobile
- **Modern Styling:** Gradient backgrounds, smooth transitions, hover effects

---

## 🔧 Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Backend:** Node.js, Express
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (Email + Google OAuth)
- **Storage:** Supabase Storage
- **Security:** Row Level Security (RLS)

---

## 📝 Project Structure

```
study-resource-platform/
├── public/
│   ├── index.html          # Main application page
│   ├── app.js              # Frontend JavaScript
│   ├── style.css           # Styles
│   └── admin-helper.html   # Admin role management tool
├── server.js               # Express server
├── setup.sql               # Database schema and RLS policies
├── package.json            # Dependencies
├── .env                    # Environment variables (not in git)
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
├── README.md               # This file
├── OAUTH_SETUP.md          # OAuth configuration guide
├── ADMIN_SETUP.md          # Admin user setup guide
└── RLS_POLICIES.md         # RLS policies documentation
```

---

## 🐛 Troubleshooting

### Admin delete not working
- Verify RLS policies are created (check `setup.sql`)
- Confirm user has `role: "admin"` in metadata
- User must log out and log back in after role change
- See `RLS_POLICIES.md` for detailed debugging

### OAuth not working
- Check redirect URI matches exactly in Google Console
- Verify Client ID and Secret in Supabase dashboard
- Ensure popup blockers are disabled
- See `OAUTH_SETUP.md` for detailed setup

### File upload fails
- Check file size (must be < 5MB)
- Verify storage bucket `study-files` exists and is public
- Check browser console for errors

### Environment variables not loading
- Ensure `.env` file exists in root directory
- Restart the server after changing `.env`
- Check for typos in variable names

---

## 🔐 Security Notes

1. **Never commit `.env` file** - Contains sensitive keys
2. **Use service role key only in backend** - Never expose in frontend
3. **Change demo account passwords** - Or delete them in production
4. **Enable RLS on all tables** - Already configured in `setup.sql`
5. **Regularly audit admin users** - Remove unnecessary admin access
6. **Use HTTPS in production** - Render provides this automatically

---

## 📄 License

MIT License - Feel free to use this project for learning or production.

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📧 Support

For issues or questions:
1. Check the documentation files
2. Review troubleshooting section
3. Open an issue on GitHub
4. Contact the maintainer

---

**Built with ❤️ for students, by students**
