# HF Communication - Mobile Repair Dashboard

## 1. Create Supabase project
Create a free project at https://supabase.com

## 2. Create database
Open SQL Editor and run `supabase-setup.sql`.

## 3. Create your login
Supabase Dashboard → Authentication → Users → Add user.
Create an email/password user.

## 4. Get API credentials
Project Settings → API:
- Project URL
- anon/public key

Open `app.js` and replace:
- YOUR_SUPABASE_URL
- YOUR_SUPABASE_ANON_KEY

Never put the service_role key into app.js.

## 5. Test
Open the folder in VS Code and run with Live Server, or deploy to Vercel/Netlify.

## 6. Deploy free
Upload the project to GitHub, then import the repository into Vercel or Netlify.

The app includes:
- Login
- Add/edit/delete repairs
- Pending / under repair / completed status
- Automatic due-within-one-hour warning
- Overdue detection
- Search and filters
- Statistics
- Active repairs view
- Repair history
- Click-to-call phone numbers
- Printable receipts
- Responsive design
