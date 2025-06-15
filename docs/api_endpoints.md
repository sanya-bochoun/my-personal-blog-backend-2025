# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
ทุก endpoint ที่ต้องการการยืนยันตัวตนจะต้องส่ง token ในรูปแบบ Bearer Token:
```
Authorization: Bearer <access_token>
```

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    // response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "string",
    "code": "string"
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 200 | OK - คำขอสำเร็จ |
| 201 | Created - สร้างรายการใหม่สำเร็จ |
| 400 | Bad Request - คำขอไม่ถูกต้อง |
| 401 | Unauthorized - ไม่ได้รับอนุญาตให้เข้าถึง (ไม่ได้เข้าสู่ระบบ) |
| 403 | Forbidden - ไม่มีสิทธิ์เข้าถึง (เข้าสู่ระบบแล้วแต่ไม่มีสิทธิ์) |
| 404 | Not Found - ไม่พบรายการที่ร้องขอ |
| 429 | Too Many Requests - ส่งคำขอมากเกินไป |
| 500 | Internal Server Error - ข้อผิดพลาดภายในเซิร์ฟเวอร์ |

## Rate Limiting

- 100 requests per IP per 15 minutes
- 1000 requests per IP per day

## File Upload Limits

- Maximum file size: 2MB
- Allowed file types: image/* (jpg, jpeg, png, gif)

## Endpoints

### Authentication

| Endpoint | Method | Description | Authentication Required |
|----------|--------|-------------|-------------------------|
| `/auth/register` | POST | ลงทะเบียนผู้ใช้ใหม่ | No |
| `/auth/login` | POST | เข้าสู่ระบบ | No |
| `/auth/refresh-token` | POST | รีเฟรช access token | No |
| `/auth/logout` | POST | ออกจากระบบ | Yes |
| `/auth/me` | GET | ดึงข้อมูลผู้ใช้ปัจจุบัน | Yes |

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string",
  "full_name": "string"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

#### Get Profile
```http
GET /auth/me
Authorization: Bearer <access_token>
```

#### Refresh Token
```http
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "string"
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

### User Management

| Endpoint | Method | Description | Authentication Required |
|----------|--------|-------------|-------------------------|
| `/users/profile` | PUT | อัปเดตโปรไฟล์ผู้ใช้ | Yes |
| `/users/upload-avatar` | POST | อัปโหลดรูปโปรไฟล์ | Yes |
| `/users/change-password` | PUT | เปลี่ยนรหัสผ่าน | Yes |

#### Update Profile
```http
PUT /users/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "full_name": "string",
  "bio": "string",
  "avatar_url": "string"
}
```

#### Upload Avatar
```http
POST /users/upload-avatar
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

avatar: <file>
```

#### Change Password
```http
PUT /users/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "current_password": "string",
  "new_password": "string"
}
```

### Posts

| Endpoint | Method | Description | Authentication Required |
|----------|--------|-------------|-------------------------|
| `/posts` | GET | ดึงรายการบทความทั้งหมด | No |
| `/posts/:slug` | GET | ดึงบทความตาม slug | No |
| `/posts` | POST | สร้างบทความใหม่ | Yes |
| `/posts/:id` | PUT | อัปเดตบทความ | Yes |
| `/posts/:id` | DELETE | ลบบทความ | Yes |
| `/posts/:id/like` | POST | กดไลค์บทความ | Yes |

#### Get All Posts
```http
GET /posts
Query Parameters:
- page: number (default: 1)
- limit: number (default: 10)
- category: string
- tag: string
- search: string
```

#### Get Post by Slug
```http
GET /posts/:slug
```

#### Create Post
```http
POST /posts
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "string",
  "content": "string",
  "description": "string",
  "tags": ["string"]
}
```

#### Update Post
```http
PUT /posts/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "string",
  "content": "string",
  "description": "string",
  "tags": ["string"]
}
```

#### Delete Post
```http
DELETE /posts/:id
Authorization: Bearer <access_token>
```

#### Toggle Like
```http
POST /posts/:id/like
Authorization: Bearer <access_token>
```

### Comments

| Endpoint | Method | Description | Authentication Required |
|----------|--------|-------------|-------------------------|
| `/posts/:postId/comments` | GET | ดึงความคิดเห็นของบทความ | No |
| `/posts/:postId/comments` | POST | เพิ่มความคิดเห็นใหม่ | Yes |
| `/comments/:id` | PUT | แก้ไขความคิดเห็น | Yes |
| `/comments/:id` | DELETE | ลบความคิดเห็น | Yes |

### Categories & Tags

| Endpoint | Method | Description | Authentication Required |
|----------|--------|-------------|-------------------------|
| `/categories` | GET | ดึงรายการหมวดหมู่ทั้งหมด | No |
| `/tags` | GET | ดึงรายการแท็กทั้งหมด | No | 