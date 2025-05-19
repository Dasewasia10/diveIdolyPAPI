# DiveIdolyPAPI API Documentation

## Overview
DiveIdolyPAPI is a RESTful API service that provides data and assets related to the mobile game "IDOLY PRIDE". This API serves card information, character data, Q&A, lyrics, stamps, and various game assets.

## Base URL
```
https://diveidolypapi.my.id
```

## Endpoints

### 1. Root Endpoint
- **GET** `/`
  - Returns welcome message and available endpoints

### 2. Card Endpoints
- **GET** `/api/cards`
  - Get all cards data
- **GET** `/api/cards/:name`
  - Get cards by character name

### 3. Q&A Endpoints
- **GET** `/api/qnas`
  - Get all Q&A data
- **GET** `/api/qnas/:name`
  - Get Q&A by character name

### 4. Lyrics Endpoints
- **GET** `/api/lyrics`
  - Get all lyrics data
- **GET** `/api/lyrics/:name`
  - Get lyrics by song title

### 5. Character Endpoints
- **GET** `/api/characters`
  - Get all characters data
- **GET** `/api/characters/:name`
  - Get character by name
- **GET** `/api/characters/group/:groupName`
  - Get characters by group name

### 6. Stamp Endpoints
- **GET** `/api/stamps`
  - Get all stamps data
- **GET** `/api/stamps/:name`
  - Get stamps by character name

### 7. Image Assets Endpoints

#### Character Images
- **GET** `/api/img/character/icon/:imageName`
  - Get character icon
- **GET** `/api/img/character/banner/:imageName`
  - Get character banner
- **GET** `/api/img/character/sprite1/:imageName`
  - Get character sprite 1
- **GET** `/api/img/character/sprite2/:imageName`
  - Get character sprite 2

#### Group Images
- **GET** `/api/img/group/circle/:imageName`
  - Get group circle image

#### Stamp Images
- **GET** `/api/img/stamps/:imageCharacter/:imageExpression`
  - Get stamp image by character and expression

#### Card Images
- **GET** `/api/img/card/cosu/:chara/:cosuName/:cosuIndex`
  - Get costume icon
- **GET** `/api/img/card/figureB/:chara/:initial/:cosuName/:cosuIndex`
  - Get figure image B
- **GET** `/api/img/card/thumb/:chara/:initial/:cosuName/:cosuIndex`
  - Get card thumbnail
- **GET** `/api/img/card/thumbB/:chara/:initial/:cosuName/:cosuIndex`
  - Get card thumbnail B
- **GET** `/api/img/card/thumbE/:chara/:initial/:cosuName/:cosuIndex`
  - Get card thumbnail E
- **GET** `/api/img/card/vertical/:chara/:initial/:cosuName/:cosuIndex`
  - Get vertical card image
- **GET** `/api/img/card/verticalB/:chara/:initial/:cosuName/:cosuIndex`
  - Get vertical card image B
- **GET** `/api/img/card/verticalE/:chara/:initial/:cosuName/:cosuIndex`
  - Get vertical card image E
- **GET** `/api/img/card/source/:chara/:initial/:cosuName/:cosuIndex`
  - Get card source image
- **GET** `/api/img/card/sourceE/:chara/:initial/:cosuName/:cosuIndex`
  - Get card source image E

### 8. Image Proxy
- **GET** `/api/proxy/image?url={image_url}`
  - Proxy for fetching images from external sources

## Usage Examples

### Get all cards
```javascript
fetch('https://diveidolypapi.my.id/api/cards')
  .then(response => response.json())
  .then(data => console.log(data));
```

### Get character by name
```javascript
fetch('https://diveidolypapi.my.id/api/characters/Kotono')
  .then(response => response.json())
  .then(data => console.log(data));
```

### Get character icon image
```html
<img src="https://diveidolypapi.my.id/api/img/character/icon/Kotono" alt="Kotono icon">
```

## CORS Policy
The API is configured to allow requests from:
- `https://diveidolypapi.my.id`
- `https://diveidolypapi.my.id/`
- `https://diveidolypapi.my.id/#/`

Allowed methods: GET, POST, PUT, DELETE

## Response Format
All successful responses return JSON data. Error responses include an error message in the format:
```json
{
  "error": "Error message"
}
```

## Rate Limiting
Currently no rate limiting is implemented, but please use responsibly.

## Cache Policy
Image assets are cached with a max-age of 86400 seconds (24 hours).

## Deployment
This API is deployed on Vercel and can be run locally by:
1. Clone the repository
2. Install dependencies: `npm install`
3. Run server: `npm start`

The server will run on `http://localhost:3000` by default.

## License
This API is provided for fan use only. All game data and assets belong to their respective copyright holders.