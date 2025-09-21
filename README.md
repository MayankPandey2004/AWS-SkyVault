# AWS-SkyVault  
**Secure Cloud File Vault System**  
Author: Mayank Pandey (22BCE0179)  

## Live Demo

[View the live project here](https://aws-sky-vault-uzwa-8ifdckll3-mpandey2004-gmailcoms-projects.vercel.app/)

---

## (YOU CAN VIEW THE PROJECT REPORT PDF FILE IN THE DOCS FOLDER FOR A BETTER READ)

## Project Overview  

AWS-SkyVault is a secure, cloud-native file vault system that provides:  
- Efficient storage through file deduplication using SHA-256 hashing.  
- Powerful search and filtering capabilities.  
- Controlled file sharing and secure access.  

It was developed as part of the **BalkanID Capstone Internship Task** and demonstrates full-stack engineering skills across backend, frontend, database design, and cloud deployment.  

Key features include:  
- Upload single or multiple files with drag-and-drop support.  
- Deduplication with reference counting for storage efficiency.  
- File metadata management (size, type, uploader, date).  
- Advanced search and filtering.  
- Storage quotas and request rate limiting.  
- Secure deletion with ownership rules.  
- User-level and system-wide statistics dashboards.  

---

## System Architecture  

AWS-SkyVault follows a serverless, cloud-native architecture consisting of:  
- **Frontend (React + TypeScript)** deployed on Vercel, with Clerk for authentication.  
- **API Gateway** as the entry point for client requests.  
- **AWS Lambda** for serverless backend execution.  
- **Supabase PostgreSQL** for relational data storage (users, files, statistics).  
- **AWS S3** for file storage with signed URL access.  
- **Docker + AWS ECR** for backend containerization and deployment.  

**System Architecture Diagram:**  
![System Architecture](https://github.com/BalkanID-University/vit-2026-capstone-internship-hiring-task-MayankPandey2004/blob/main/docs/resources/Architecture.png)

---

## Tech Stack  

**Frontend**  
- React.js + TypeScript  
- Vercel (deployment)  
- Clerk Auth (authentication and session management)  

**Backend**  
- Go (Golang)  
- AWS Lambda (serverless compute)  
- API Gateway (routing and throttling)  

**Database & Storage**  
- Supabase (PostgreSQL)  
- AWS S3 (object storage)  

**Containerization & Deployment**  
- Docker  
- AWS ECR  

**DevOps & Tooling**  
- Docker Compose  
- GitHub (version control)  
- Postman and Apidog (API testing)  

---

## Setup Instructions  

### 1. Prerequisites  
- Go (v1.20+)  
- Node.js (v18+) with npm or yarn  
- Docker and Docker Compose  
- AWS Account with S3 and ECR enabled  
- Supabase account (PostgreSQL)  
- Clerk account for authentication  

### 2. Clone Repository  
```bash
git clone https://github.com/BalkanID-University/vit-2026-capstone-internship-hiring-task-MayankPandey2004.git
cd vit-2026-capstone-internship-hiring-task-MayankPandey2004
```

### 3. Configure Environment Variables  
Create a `.env` file with:  
```bash
PORT=8080
DB_URL=postgresql://<username>:<password>@<host>:5432/<database>
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<your_aws_access_key>
AWS_SECRET_ACCESS_KEY=<your_aws_secret_key>
S3_BUCKET_NAME=<your_bucket_name>

CLERK_FRONTEND_API=<your_clerk_frontend_api>
CLERK_API_KEY=<your_clerk_api_key>

MAX_STORAGE_MB=10
RATE_LIMIT=2
```

### 4. Run Backend  
```bash
cd backend
go mod tidy
go run main.go
```

### 5. Run Frontend  
```bash
cd frontend
npm install
npm run dev
```
Access at: `http://localhost:3000`  

### 6. Run with Docker  
```bash
docker-compose up --build
```

### 7. Deployment  
- Frontend: Vercel  
- Backend: Docker → AWS ECR → AWS Lambda  
- Database: Supabase  
- Storage: AWS S3  

---

## Database Schema  

The PostgreSQL schema includes:  
- **users** – user accounts  
- **user_files** – mapping between users and uploaded files  
- **file_blobs** – deduplicated file objects stored in S3  
- **user_stats** – per-user statistics  
- **system_stats** – system-wide usage statistics  

**Database Schema Diagram:**  
![Database Schema](https://github.com/BalkanID-University/vit-2026-capstone-internship-hiring-task-MayankPandey2004/blob/main/docs/resources/PostgresDB.png?raw=true)


---

## API Documentation  

### File Management  
- `POST /upload` → Upload file(s), enforce quota and deduplication.  
- `GET /files?username=<email>` → List files for a user.  
- `GET /download?key=<s3Key>` → Download a file from S3 via pre-signed URL.  
- `DELETE /delete?key=<s3Key>` → Delete a file, respecting deduplication reference counts.  

### Search  
- `GET /search?q=...&mime=...&size_min=...&date_from=...` → Search and filter files.  

### Statistics  
- `GET /admin/system-stats` → Global system statistics.  
- `GET /admin/user-stats?email=<email>` → Per-user statistics.  
- `GET /admin/file-details?username=<email>` → File details for a user.  

### Error Codes  
- **429 Too Many Requests** → Rate limit exceeded.  
- **413 Payload Too Large** → Storage quota exceeded.  

---

## Features Implemented  

- Authentication and Role-Based Access Control (Clerk).  
- File uploads (single, multiple, drag-and-drop, MIME validation).  
- Deduplication (SHA-256 + reference counts).  
- File listing, metadata display, and secure deletion.  
- Search and filtering.  
- User-level and system-level statistics.  
- Quotas (10 MB per user) and rate limits (2 requests/second).  
- Serverless backend using AWS Lambda and API Gateway.  
- S3 storage with pre-signed URLs.  
- Frontend deployed on Vercel with global CDN (CloudFront).  

---

## Testing & Quality  

**Automated API Testing (Apidog):**  
- Total Assertions: 36  
- Passed: 32 (88.89%)  
- Failed: 4 (11.11%) – all failures occurred for file uploads exceeding 10 MB, which is the expected behavior due to enforced storage quotas.  

**Tested Endpoints:**  
- Upload (valid, duplicate, quota enforcement).  
- List files with metadata.  
- Download files and verify stats increment.  
- Delete files and validate deduplication logic.  
- Admin endpoints for system stats, user stats, and file details.  

**Functional Validation:**  
- Quota enforcement works as intended.  
- Deduplication logic correctly avoids redundant storage.  
- Ownership rules enforced during deletion.  
- User and system statistics updated accurately.  

**Quality Practices:**  
- Linting and formatting: ESLint, Prettier (frontend), golangci-lint (backend).  
- Unit and integration tests on backend logic (Go).  
- React component tests with Jest and React Testing Library.  
- Manual API verification using Postman.  

**Testing Report:**  
![Test 1](https://github.com/BalkanID-University/vit-2026-capstone-internship-hiring-task-MayankPandey2004/blob/main/docs/resources/Test1.png?raw=true)  
![Test 2](https://github.com/BalkanID-University/vit-2026-capstone-internship-hiring-task-MayankPandey2004/blob/main/docs/resources/Test2.png?raw=true)


---

## Future Improvements  

- Audit logs for compliance.  
- Client-side encryption for zero-trust security.  
- Folder support and file previews.  
- File versioning and rollback.  
- Background jobs (virus scanning, thumbnail generation).  
- Enhanced CDN optimization.  
- CloudWatch integration for monitoring.  
- Multi-cloud support (Azure, GCP).  
- Infrastructure as Code with Terraform or AWS CDK.  

---

## Credits & References  

**Author:** Mayank Pandey (22BCE0179)  
**Task:** BalkanID Capstone Internship Project (VIT 2026)  

**Technologies:** Go, React, TypeScript, Supabase, AWS (S3, Lambda, API Gateway, CloudFront, ECR), Docker, Clerk, Vercel  

**Documentation & Tools:** GoDoc, React Docs, Supabase Docs, AWS Docs, Postman, Apidog, GitHub Actions  

---

AWS-SkyVault demonstrates a secure, production-ready file vault system built with full-stack, cloud-native engineering practices.







