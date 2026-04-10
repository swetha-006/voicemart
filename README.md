# VoiceMart

VoiceMart is a production-ready, voice-enabled e-commerce platform designed to improve shopping accessibility for people with disabilities. It pairs a Next.js 14 frontend with a Flask API, JWT auth, PostgreSQL or SQLite persistence, browser-native speech recognition, spoken confirmations, low-stock alert automation, and a full admin control center.

## Stack

- Frontend: Next.js 14 App Router, React 18, Tailwind CSS, Framer Motion, Zustand
- Backend: Flask, Flask-JWT-Extended, Flask-CORS, Flask-Bcrypt, APScheduler, SQLAlchemy ORM, Flask-Migrate
- Database: PostgreSQL in production, SQLite fallback for local development
- Voice: Web Speech API for STT and SpeechSynthesis for TTS
- NLP: spaCy plus keyword/entity mapping on the Flask backend

## Project Layout

```text
frontend/   Next.js application
backend/    Flask API and services
README.md   Setup and deployment guide
```

## Local Setup

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
cp .env.example .env
python init_db.py
python seed.py
python run.py
```

Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m spacy download en_core_web_sm
Copy-Item .env.example .env
.venv\Scripts\python.exe init_db.py
.venv\Scripts\python.exe seed.py
.venv\Scripts\python.exe run.py
```

API default URL: `http://localhost:5001`

Seeded admin credentials:

- Email: `admin@voicemart.com`
- Password: `Admin@123`

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend default URL: `http://localhost:3000`

## Environment Variables

### Frontend

Use [`/frontend/.env.example`](/F:/Voicemart_Project/frontend/.env.example):

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_API_URL`

### Backend

Use [`/backend/.env.example`](/F:/Voicemart_Project/backend/.env.example):

- `FLASK_ENV`
- `SECRET_KEY`
- `JWT_SECRET_KEY`
- `FRONTEND_ORIGIN`
- `USE_SQLITE`
- `SQLITE_PATH`
- `DATABASE_URL`
- `BCRYPT_LOG_ROUNDS`
- `LOW_STOCK_SCAN_INTERVAL_MINUTES`
- `SCHEDULER_TIMEZONE`
- `PUBLIC_APP_URL`
- `EMAIL_NOTIFICATIONS_ENABLED`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_USE_TLS`
- `SMTP_USE_SSL`
- `MAIL_FROM_ADDRESS`
- `MAIL_FROM_NAME`
- `EMAIL_SEND_TIMEOUT`
- `REGISTRATION_OTP_EXPIRY_MINUTES`
- `REGISTRATION_OTP_MAX_ATTEMPTS`
- `PORT`

## Database Migration Commands

VoiceMart includes Flask-Migrate integration and a reserved migrations directory.

```bash
cd backend
export FLASK_APP=run.py
flask db init
flask db migrate -m "initial schema"
flask db upgrade
```

Windows PowerShell:

```powershell
cd backend
$env:FLASK_APP="run.py"
flask db init
flask db migrate -m "initial schema"
flask db upgrade
```

If you want a zero-migration local bootstrap, use:

```powershell
cd backend
.venv\Scripts\python.exe init_db.py
```

That creates the tables immediately from the SQLAlchemy models and is the fastest way to get login, registration, carts, orders, and notifications working in local development.

## Voice Features

- Continuous speech recognition with start and stop toggle
- Spoken confirmation for add-to-cart, buy-now, navigation, search, and logout flows
- Fuzzy product selection with focus highlight and modal open
- Cart drawer can be opened by click or voice at any time
- Voice orb remains mounted globally in the shared layout
- Backend `/voice/process` endpoint classifies search, cart, checkout, tracking, navigation, scroll, and unknown intents

## Running With PostgreSQL

Set the backend `.env` values:

```env
USE_SQLITE=false
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/voicemart
```

Then run migrations and seed data again.

## Troubleshooting

- `ERR_CONNECTION_REFUSED` on `http://localhost:5001` means the Flask backend is not running or is on the wrong port.
- Keep `frontend/.env.local` aligned with the backend port:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

- Keep `backend/.env` aligned with the frontend origin:

```env
PORT=5001
FRONTEND_ORIGIN=http://localhost:3000,http://localhost:5000
```

- If login or registration fails after a fresh clone, initialize the tables first with `python init_db.py`, then seed with `python seed.py`.

## Email Notifications

VoiceMart now supports transactional customer emails for:

- account registration
- order confirmation
- order processing updates
- shipping updates
- delivery confirmation
- order cancellation
- registration OTP verification
- admin-triggered SMTP test delivery

Configure these backend values before enabling email delivery:

```env
PUBLIC_APP_URL=http://localhost:5000
EMAIL_NOTIFICATIONS_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password-or-app-password
SMTP_USE_TLS=true
SMTP_USE_SSL=false
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME=VoiceMart
EMAIL_SEND_TIMEOUT=15
REGISTRATION_OTP_EXPIRY_MINUTES=10
REGISTRATION_OTP_MAX_ATTEMPTS=5
```

For Gmail, use:

1. Turn on Google 2-Step Verification.
2. Generate a Google App Password for Mail.
3. Set both `SMTP_USERNAME` and `MAIL_FROM_ADDRESS` to that Gmail address.
4. Set `SMTP_PASSWORD` to the generated app password.

Local development can use any SMTP inbox testing service such as Mailtrap or a local SMTP catcher. If `EMAIL_NOTIFICATIONS_ENABLED=false`, VoiceMart will keep in-app notifications active and, in development/testing, expose the OTP in the API response for local verification.

Admin users can also verify SMTP setup from the dashboard through the new test-email form, which calls the protected backend endpoint `POST /admin/test-email`.

## Registration OTP

Customer registration now follows a two-step email verification flow:

1. Submit full name, email, and password.
2. VoiceMart sends a 6-digit OTP to the customer email.
3. Submit the OTP to complete registration and receive the JWT session.

The verification code expiry and max retry count are controlled by:

```env
REGISTRATION_OTP_EXPIRY_MINUTES=10
REGISTRATION_OTP_MAX_ATTEMPTS=5
```

## Vercel Deployment

1. Push the repository to GitHub.
2. Import the `frontend` directory into Vercel.
3. Set `NEXT_PUBLIC_API_URL` to your deployed Flask backend URL.
4. Vercel will automatically use [`vercel.json`](/F:/Voicemart_Project/frontend/vercel.json).
5. Build command: `npm run build`
6. Output is handled by Next.js automatically.

## Render Deployment

1. Push the repository to GitHub.
2. Create a new Blueprint deployment on Render from the repository root.
3. Render will read [`render.yaml`](/F:/Voicemart_Project/backend/render.yaml).
4. Set `FRONTEND_ORIGIN` to the deployed Vercel origin.
5. Set the SMTP and `MAIL_FROM_ADDRESS` variables if you want customer lifecycle emails enabled in production.
6. Set `REGISTRATION_OTP_EXPIRY_MINUTES` and `REGISTRATION_OTP_MAX_ATTEMPTS` if you want custom OTP policy.
7. Confirm the managed PostgreSQL database is provisioned.
8. After the first deploy, run `python seed.py` once from the Render shell if you want the demo catalog and admin user.

## Railway Deployment

1. Create a Railway service pointed at the `backend` directory.
2. Install command: `pip install -r requirements.txt && python -m spacy download en_core_web_sm`
3. Start command: `gunicorn run:app`
4. Add all backend environment variables from `.env.example`.
5. Attach a PostgreSQL database and set `USE_SQLITE=false`.

## Notable Files

- Frontend shell: [`ClientShell.jsx`](/F:/Voicemart_Project/frontend/components/ui/ClientShell.jsx)
- Voice engine hook: [`useVoiceEngine.js`](/F:/Voicemart_Project/frontend/components/voice/useVoiceEngine.js)
- API layer: [`api.js`](/F:/Voicemart_Project/frontend/lib/api.js)
- Flask app factory: [`__init__.py`](/F:/Voicemart_Project/backend/app/__init__.py)
- NLP service: [`nlp_service.py`](/F:/Voicemart_Project/backend/app/services/nlp_service.py)
- Order service: [`order_service.py`](/F:/Voicemart_Project/backend/app/services/order_service.py)
- Inventory scheduler: [`inventory_service.py`](/F:/Voicemart_Project/backend/app/services/inventory_service.py)
- Email service: [`email_service.py`](/F:/Voicemart_Project/backend/app/services/email_service.py)
- OTP service: [`otp_service.py`](/F:/Voicemart_Project/backend/app/services/otp_service.py)

## Production Notes

- The backend uses bcrypt with 12 rounds and JWT expiry of 24 hours.
- CORS is restricted to the configured frontend origin.
- SQLite foreign keys are enabled automatically for local development.
- APScheduler runs a low-stock scan every 30 minutes by default.
- If `en_core_web_sm` is unavailable at runtime, the NLP service falls back gracefully to a blank spaCy pipeline, but production deployments should install the model during build.
