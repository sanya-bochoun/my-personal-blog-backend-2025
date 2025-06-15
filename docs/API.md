# API Documentation

## Authentication Endpoints

### Register
```http
POST /api/auth/register
```
Request Body:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "full_name": "string"
}
```
Response:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "number",
      "username": "string",
      "email": "string",
      "full_name": "string",
      "avatar_url": "string|null",
      "role": "string",
      "created_at": "timestamp"
    }
  }
}
```

### Login
```http
POST /api/auth/login
```
Request Body:
```json
{
  "email": "string",
  "password": "string"
}
```
Response:
```json
{
  "status": "success",
  "data": {
    "token": "string",
    "refresh_token": "string",
    "user": {
      "id": "number",
      "username": "string",
      "email": "string"
    }
  }
}
```

## User Endpoints

### Get User Profile
```http
GET /api/users/profile
```
Headers:
```http
Authorization: Bearer {token}
```
Response:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "number",
      "username": "string",
      "email": "string",
      "full_name": "string",
      "avatar_url": "string",
      "bio": "string",
      "role": "string"
    }
  }
}
```

## Post Endpoints

### Create Post
```http
POST /api/posts
```
Headers:
```http
Authorization: Bearer {token}
```
Request Body:
```json
{
  "title": "string",
  "content": "string",
  "excerpt": "string",
  "category_id": "number",
  "featured_image": "string",
  "published": "boolean",
  "tags": ["number"]
}
```

### Get Posts
```http
GET /api/posts
```
Query Parameters:
```
page: number (default: 1)
limit: number (default: 10)
sort: string (default: 'created_at')
order: 'asc'|'desc' (default: 'desc')
search: string
category: number
author: number
tag: number
published: boolean
```

## Comment Endpoints

### Create Comment
```http
POST /api/posts/{postId}/comments
```
Headers:
```http
Authorization: Bearer {token}
```
Request Body:
```json
{
  "content": "string",
  "parent_id": "number|null"
}
```

### Get Post Comments
```http
GET /api/posts/{postId}/comments
```
Query Parameters:
```
page: number (default: 1)
limit: number (default: 10)
sort: string (default: 'created_at')
order: 'asc'|'desc' (default: 'desc')
```

## Category Endpoints

### Create Category
```http
POST /api/categories
```
Headers:
```http
Authorization: Bearer {token}
```
Request Body:
```json
{
  "name": "string",
  "description": "string"
}
```

### Get Categories
```http
GET /api/categories
```

## Tag Endpoints

### Create Tag
```http
POST /api/tags
```
Headers:
```http
Authorization: Bearer {token}
```
Request Body:
```json
{
  "name": "string",
  "slug": "string"
}
```

### Get Tags
```http
GET /api/tags
```

## Error Responses

### 400 Bad Request
```json
{
  "status": "error",
  "message": "Invalid request parameters",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "Unauthorized access"
}
```

### 403 Forbidden
```json
{
  "status": "error",
  "message": "Access forbidden"
}
```

### 404 Not Found
```json
{
  "status": "error",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Internal server error"
}
``` 