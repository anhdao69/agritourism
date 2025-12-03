## COPY the .env file
```
# NextAuth v4
NEXTAUTH_SECRET="758911571cd693685a43591b38cbc748b6860a3802519edb0f2a4034c0b006a0"

# DBs
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Databases
# Use the dedicated app user we just created
DATABASE_URL="mysql://agri:agripass@localhost:3307/agritourism"
SHADOW_DATABASE_URL="mysql://agri:agripass@localhost:3307/agritourism_shadow"


AWS_REGION="us-east-1"
AWS_SMTP_USER="AKIATCZBGNUAL2KF33HB"        # NOT the SES SMTP username
AWS_SMTP_PASS="BOaS3ra1ad7jjUeC6MM3bw/nzPzvmw/eGinu2ElHaKhS"

# --- SES From identity (must be verified in SES; domain or mailbox) ---
SES_FROM_EMAIL="cuiyue@msu.edu"
SES_FROM_NAME="Yue Cui"

AWS_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
AWS_SMTP_PORT=587

# Seed admin (used by prisma/seed.ts one-time)
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="Admin123!"

# (Optional) Google OAuth (if you keep the button)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

## Run frontend
```
npm install prisma --save-dev
npm install @prisma/client
docker-compose up --build -d
npx prisma generate
npx prisma db pull
npx prisma db seed
docker-compose exec app npx prisma studio
```
## Run backend
```
cd backend
docker build -t agritourism-backend .
docker run -p 8000:8000  -v "D:\agritourism:/data" agritourism-backend

```



