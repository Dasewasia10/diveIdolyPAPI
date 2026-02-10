# DiveIdolyPAPI API Documentation

## Overview
DiveIdolyPAPI is a RESTful API service dedicated to providing data and assets for the "IDOLY PRIDE" franchise. This API serves card information, character data, Q&A, lyrics, stamps, in-game messages, story scripts, and acts as a proxy for various game assets.

## Base URL

[DiveIdolyPAPI](https://diveidolypapi.my.id)
https://diveidolypapi.my.id

## Endpoints

### 1. Root Endpoint
- **GET** `/`
  - Returns a welcome message and a list of available endpoints.

### 2. Card Endpoints
- **GET** `/api/cards`
  - Retrieves all available card data.
- **GET** `/api/cards/:name`
  - Retrieves cards filtered by character name (e.g., `/api/cards/Mana`).

### 3. Q&A Endpoints
- **GET** `/api/qnas`
  - Retrieves all Question & Answer data.
- **GET** `/api/qnas/:name`
  - Retrieves Q&A entries filtered by character name.

### 4. Lyrics Endpoints
- **GET** `/api/lyrics`
  - Retrieves all song lyrics data.
- **GET** `/api/lyrics/:name`
  - Retrieves lyrics filtered by song title.

### 5. Character Endpoints
- **GET** `/api/characters`
  - Retrieves general data for all characters.
- **GET** `/api/characters/:name`
  - Retrieves specific character details by name.
- **GET** `/api/characters/group/:groupName`
  - Retrieves characters filtered by their group name (e.g., `LizNoir`, `TRINITYAiLE`).

### 6. Stamp Endpoints
- **GET** `/api/stamps`
  - Retrieves a collection of in-game stamp assets.

### 7. Message System Endpoints
- **GET** `/api/messages/index.json`
  - Retrieves the index list of all available message conversations (Idoly Chat).
- **GET** `/api/messages/detail/:id.json`
  - Retrieves the detailed chat script for a specific message ID.

### 8. Love Story Endpoints (Moshikoi/Mintsuku)
- **GET** `/api/lovestory/index.json`
  - Retrieves the index list of Love Story events and episodes.
- **GET** `/api/lovestory/stories/:id.json`
  - Retrieves the full dialogue script (including voice paths and text) for a specific story ID.

### 9. Utility Endpoints
- **GET** `/api/proxy/image?url={image_url}`
  - Acts as a proxy to fetch images from external sources to bypass CORS restrictions on the frontend.

---

## Usage Examples

### Javascript (Fetch)

**Get all cards:**
```javascript
fetch('[https://diveidolypapi.my.id/api/cards](https://diveidolypapi.my.id/api/cards)')
  .then(response => response.json())
  .then(data => console.log(data));

```

**Get character by name:**

```javascript
fetch('[https://diveidolypapi.my.id/api/characters/Kotono](https://diveidolypapi.my.id/api/characters/Kotono)')
  .then(response => response.json())
  .then(data => console.log(data));

```

**Get a Love Story script:**

```javascript
fetch('[https://diveidolypapi.my.id/api/lovestory/stories/adv_love_2305_01_01.json](https://diveidolypapi.my.id/api/lovestory/stories/adv_love_2305_01_01.json)')
  .then(response => response.json())
  .then(data => console.log(data));

```

---

## CORS Policy

The API is configured to allow Cross-Origin Resource Sharing (CORS) primarily from the following origins:

* `https://polaris.diveidolypapi.my.id`
* `http://localhost:5173` (For development)

**Allowed Methods:** `GET`, `POST`, `PUT`, `DELETE`

## Response Format

All successful responses return data in **JSON** format.
Error responses include an error message in the following format:

```json
{
  "error": "Description of the error"
}

```

## Cache Policy

* **Image Proxy:** Images fetched via the proxy are cached with a `max-age` of 86400 seconds (24 hours).
