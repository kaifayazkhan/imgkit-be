# Image Processing API

A RESTful API built with **Node.js + Express** that allows users to:
- Register and log in securely using JWT authentication
- Upload images via pre-signed S3 URLs
- Perform image transformations (resize, format conversion, grayscale, etc.)
- Retrieve and manage transformed images
- Enforce fair usage with configurable **rate limiting**

---

## Features

- **Authentication** — Register, login, refresh tokens, and logout endpoints
- **Image Uploads** — Generate pre-signed S3 URLs for direct client uploads
- **Image Transformations** — Resize, compress, or reformat images dynamically
- **Rate Limiting** — Prevent abuse of critical endpoints (upload & transform)
- **Secure Cookies** — Access & refresh tokens stored using `httpOnly` + `secure` flags
- **Zod Validation** — Type-safe request validation at runtime

---

## Setup & Installation

### Clone the repository

```bash
git clone https://github.com/kaifayazkhan/image-transform-api
cd image-transform-api
```

### Install dependencies

```bash
npm install
# or
pnpm install
```

### Configure environment variables
Create a .env file in the root with the following:

```bash
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=your_db_connection_string

# Logger
BETTER_STACK_SOURCE_TOKEN=
BETTER_STACK_ENDPOINT=

# JWT Secrets
ACCESS_TOKEN_SECRET=your_access_secret
REFRESH_TOKEN_SECRET=your_refresh_secret

# AWS Config
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your_bucket_name
IMAGE_DOMAIN=your_cloudfront_url
```

### Run the app
```bash
npm run dev
```

Server will start at:
http://localhost:3000


### Authentication Flow

| Step  | Endpoint                | Method | Description                              |
|-------| ----------------------- | ------ |------------------------------------------|
| 1     | `/api/v1/auth/register` | POST   | Register a new user                      |
| 2     | `/api/v1/auth/login`    | POST   | Login and receive tokens                 |
| 3     | `/api/v1/auth/refresh`  | GET    | Refresh access token using stored cookie |
| 4     | `/api/v1/auth/logout`   | POST   | Logout and clear cookies                 |


### Image Endpoints

| Category        | Endpoint                       | Method | Description                            |
| --------------- | ------------------------------ | ------ | -------------------------------------- |
| Upload          | `/api/v1/images/upload`        | POST   | Generate S3 pre-signed URL for upload  |
| Transform       | `/api/v1/images/:id/transform` | POST   | Apply transformations to an image      |
| Get Transformed | `/api/v1/images/:id`           | GET    | Get a transformed image by ID          |
| List All        | `/api/v1/images`               | GET    | Get all transformed images (paginated) |
