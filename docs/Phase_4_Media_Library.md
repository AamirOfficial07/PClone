# Phase 4 – Media Library (Local File Storage) and Basic Attachments

**Audience:**  
- Solo developer implementing media management.  
- Automated coding agents integrating media with posts.

**Goal of Phase 4:**  
Introduce a **Media Library** so users can upload, browse, and attach media (images & videos) to PostVariants.

After Phase 4 is completed:

- Users can upload media assets to a workspace.
- Media files are stored on the local file system; metadata is stored in SQL Server.
- Media assets can be attached to PostVariants.
- The Angular SPA has:
  - Media library page.
  - Media picker integrated into the post composer.

> IMPORTANT FOR CODING AGENTS:  
> - Storage in this phase is **local file system only** (no cloud storage).  
> - Only support a single media asset per PostVariant (as defined in Phase 3).  
> - Do not implement media editing (crop, watermark) yet; only upload, list, attach, delete.

---

## 1. Domain Model – Media

In `SocialOrchestrator.Domain`:

Create folder: `Media/`.

### 1.1 MediaType Enum

File: `Media/MediaType.cs`

Values:

- `Image = 1`
- `Video = 2`
- (No other types for Phase 4.)

### 1.2 MediaAsset Entity

File: `Media/MediaAsset.cs`

Properties:

- `Guid Id`
- `Guid WorkspaceId`
- `MediaType Type`
- `string FileName`  
  - Original filename as uploaded.
- `string StoragePath`  
  - Relative path on server (e.g., `media/{workspaceId}/{generatedFileName}`).
- `string ContentType`  
  - MIME type (e.g., `image/jpeg`).
- `long SizeBytes`
- `int? WidthPixels`  
  - Optional; can be null if not known.
- `int? HeightPixels`
- `TimeSpan? Duration`  
  - For videos; can be null for images.
- `DateTime CreatedAt`
- `Guid CreatedByUserId`

> Do not add cross-workspace sharing in this phase; each media asset belongs to one workspace.

---

## 2. Infrastructure – EF Core for Media

In `SocialOrchestrator.Infrastructure`:

### 2.1 DbSet

Add to `AppDbContext`:

- `DbSet<MediaAsset> MediaAssets { get; set; }`

### 2.2 Entity Configuration

Configure `MediaAsset`:

- Table name: `MediaAssets`.
- Primary key: `Id`.
- Index on `WorkspaceId`.
- Required fields:
  - `WorkspaceId`, `Type`, `FileName`, `StoragePath`, `ContentType`, `SizeBytes`, `CreatedAt`, `CreatedByUserId`.

### 2.3 Migration

Create migration:

- Name: `Phase4_MediaAssets`.

Run:

- `dotnet ef migrations add Phase4_MediaAssets`
- `dotnet ef database update`.

Verify `MediaAssets` table exists.

---

## 3. Infrastructure – Local File Storage Service

We need an abstraction to allow local file storage now and possible cloud storage later.

In `SocialOrchestrator.Application`:

Create folder: `Media/Services`.

Interface: `IMediaStorageService`.

Methods:

- `Task<string> SaveAsync(Guid workspaceId, string originalFileName, string contentType, Stream contentStream, CancellationToken cancellationToken = default);`
  - Returns `storagePath` (relative to a configured root).

- `Task DeleteAsync(string storagePath, CancellationToken cancellationToken = default);`

- `string GetPublicUrl(string storagePath);`
  - For Phase 4, this may return a relative path like `/media/{...}` served by the API.

In `SocialOrchestrator.Infrastructure`:

Create folder: `Media/`.

Class: `LocalFileSystemMediaStorageService` implements `IMediaStorageService`.

### 3.1 Configuration

Add config section in `appsettings.json`:

```json
"Media": {
  "RootPath": "media",          // relative to content root, e.g., ./media
  "BaseUrlPath": "/media"       // base URL prefix for serving files
}
```

- `RootPath`: physical directory where files will be stored.
- `BaseUrlPath`: URL path used when exposing media.

### 3.2 Implementation Details

- On `SaveAsync`:
  - Ensure directory exists: `{RootPath}/{workspaceId}`.
  - Generate a unique file name (e.g., `Guid.NewGuid()` + file extension).
  - Save the stream to disk at: `{RootPath}/{workspaceId}/{uniqueFileName}`.
  - Return `storagePath` = `{workspaceId}/{uniqueFileName}`.

- On `DeleteAsync`:
  - Combine `RootPath` + `storagePath`.
  - Delete the file if it exists.

- On `GetPublicUrl`:
  - Return `${BaseUrlPath}/{storagePath}`.

Register in DI:

- `services.AddScoped<IMediaStorageService, LocalFileSystemMediaStorageService>();`

---

## 4. Application Layer – Media Service

In `SocialOrchestrator.Application`:

Create folder: `Media/Dto`.

DTOs:

- `MediaAssetDto`:
  - `Guid Id`
  - `MediaType Type`
  - `string FileName`
  - `string Url` (public URL from storage)
  - `string ContentType`
  - `long SizeBytes`
  - `int? WidthPixels`
  - `int? HeightPixels`
  - `TimeSpan? Duration`
  - `DateTime CreatedAt`
  - `Guid CreatedByUserId`

- `UploadMediaResultDto`:
  - `MediaAssetDto Asset`

Create folder: `Media/Services`.

Interface: `IMediaService`.

Methods:

- `Task<Result<MediaAssetDto>> UploadMediaAsync(Guid userId, Guid workspaceId, string fileName, string contentType, Stream contentStream);`
- `Task<Result<IReadOnlyList<MediaAssetDto>>> ListMediaAsync(Guid userId, Guid workspaceId, int pageNumber, int pageSize);`
- `Task<Result> DeleteMediaAsync(Guid userId, Guid workspaceId, Guid mediaAssetId);`

> Pagination here can be simple (skip/take) for Phase 4.

In `SocialOrchestrator.Infrastructure`:

Create class: `Media/MediaService.cs` implementing `IMediaService`.

Dependencies:

- `AppDbContext _dbContext`
- `IMediaStorageService _storageService`

### 4.1 UploadMediaAsync

Steps:

1. Validate user is a member of `workspaceId`.
2. Determine `MediaType` from `contentType`:
   - If `contentType.StartsWith("image/")` → `MediaType.Image`.
   - If `contentType.StartsWith("video/")` → `MediaType.Video`.
   - Else → return `Result.Failure("Unsupported media type.")`.
3. Call `_storageService.SaveAsync()` to store the file.
4. Create `MediaAsset` with:
   - `WorkspaceId`, `Type`, `FileName`, `StoragePath`, `ContentType`, `SizeBytes` (from stream length if known), `CreatedAt = UtcNow`, `CreatedByUserId`.
   - Leave `WidthPixels`, `HeightPixels`, `Duration` null for now (can be added later using metadata extraction).
5. Save changes and return `MediaAssetDto` with `Url = _storageService.GetPublicUrl(storagePath)`.

### 4.2 ListMediaAsync

Steps:

1. Validate user is member of workspace.
2. Query `MediaAssets` where `WorkspaceId = workspaceId`.
3. Order by `CreatedAt` descending.
4. Apply pagination (skip, take).
5. Map to `MediaAssetDto` using `GetPublicUrl`.

### 4.3 DeleteMediaAsync

Steps:

1. Validate user is member of workspace.
2. Load `MediaAsset` by `mediaAssetId` and `workspaceId`.
3. If not found, return `Result.Failure("Not found")`.
4. Call `_storageService.DeleteAsync(asset.StoragePath)`.
5. Remove `MediaAsset` from DbContext and save.
6. Return `Result.Success()`.

Register `IMediaService` in DI:

- `services.AddScoped<IMediaService, MediaService>();`

---

## 5. API – Media Controller and Static File Serving

In `SocialOrchestrator.Api`:

### 5.1 Static File Serving

In `Program.cs`:

- Configure static file middleware to serve files from the `Media.RootPath`:

  - Use `UseStaticFiles` with `PhysicalFileProvider` pointing to the configured root directory.

  - Map request path `/media` to that directory.

> Ensure security: media is workspace-specific, but for now we accept that media URLs are semi-public. Fine-grained access control can be added later.

### 5.2 MediaController

Create `MediaController`:

- Route: `[Route("api/workspaces/{workspaceId:guid}/media")]`
- `[Authorize]` on controller.

Endpoints:

1. `POST /api/workspaces/{workspaceId}/media`
   - Accepts multipart form-data upload with one file field (e.g., `file`).
   - Use `IFormFile` to access upload.
   - Call `IMediaService.UploadMediaAsync(userId, workspaceId, file.FileName, file.ContentType, file.OpenReadStream())`.
   - Return `MediaAssetDto`.

2. `GET /api/workspaces/{workspaceId}/media`
   - Query params: `pageNumber`, `pageSize` (default reasonable values).
   - Call `IMediaService.ListMediaAsync`.
   - Return list of `MediaAssetDto` (for now no PagedResult wrapper, unless you want it consistent).

3. `DELETE /api/workspaces/{workspaceId}/media/{mediaId}`
   - Call `IMediaService.DeleteMediaAsync`.
   - Return `204 No Content` or `200 OK` on success.

> FOR CODING AGENTS:  
> - Do not implement rename or tag APIs in this phase.  
> - Only implement upload, list, delete.

---

## 6. Integration with Posts (Backend)

In Phase 3, `PostVariant` already has `MediaAssetId`.

In Phase 4:

- Make sure `PostVariant.MediaAssetId` is configured as FK to `MediaAssets.Id` in EF Core (if not already).

When creating posts:

- The Angular composer (Phase 4 enhancements) will pass `MediaAssetId` for each variant.
- Backend `PostService.CreatePostWithVariantsAsync` must already accept and store `MediaAssetId` (as defined in Phase 3 DTOs).
- No additional changes are required now beyond validating that:
  - `MediaAssetId` belongs to the same workspace as the Post.
  - If invalid, return an error.

---

## 7. Frontend – Media Library UI

In Angular app:

### 7.1 Media Module

Create `MediaModule`:

- Route: `/workspaces/:workspaceId/media`.

Components:

1. `MediaListComponent`:
   - On init:
     - Read `workspaceId` from route.
     - Call `GET /api/workspaces/{workspaceId}/media`.
   - Display grid or list of thumbnails.
     - Use `<img [src]="asset.url">` for images.
     - For videos, show a placeholder icon or `<video>` tag (can be simplified for Phase 4).
   - Controls:
     - Upload button.
     - Delete button per media item.

2. `MediaUploadComponent` (could be integrated into `MediaListComponent`):
   - File input (`<input type="file">`).
   - On change:
     - For each selected file (or just first in Phase 4):
       - Use `FormData` with `file` field.
       - POST to `MediaController`.

### 7.2 Angular Service

Create `MediaApiService`:

Methods:

- `upload(workspaceId: string, file: File): Observable<MediaAssetDto>`
- `list(workspaceId: string, pageNumber: number, pageSize: number): Observable<MediaAssetDto[]>`
- `delete(workspaceId: string, mediaId: string): Observable<void>`

Use Angular `HttpClient` and handle auth via existing interceptor.

---

## 8. Frontend – Media Picker in Post Composer

Update `PostComposerComponent` (Phase 3 component):

- For each PostVariant form:
  - Add a button “Choose Media”.
  - When clicked:
    - Either open a modal with `MediaListComponent` (reused as picker mode).
    - Or a simple select list of media assets fetched from `MediaApiService.list`.

- On selection:
  - Store `mediaAssetId` in the variant form model.
  - Show thumbnail preview using `asset.url`.

On submit:

- Ensure `CreatePostVariantRequest.MediaAssetId` is filled with selected asset ID.

---

## 9. Manual Verification Checklist (End of Phase 4)

1. **Database**:
   - `MediaAssets` table exists.
   - `PostVariants.MediaAssetId` is properly linked to `MediaAssets.Id`.

2. **File Storage**:
   - When you upload a file:
     - File is created under `media/{workspaceId}/...`.
     - File is accessible via URL `/media/{workspaceId}/...` in browser.

3. **API**:
   - `POST /api/workspaces/{workspaceId}/media` uploads a file and returns metadata with a URL.
   - `GET /api/workspaces/{workspaceId}/media` returns a list of media.
   - `DELETE /api/workspaces/{workspaceId}/media/{mediaId}` deletes metadata and removes file.

4. **Frontend**:
   - Media library page shows uploaded media.
   - Post composer allows selecting a media asset for a PostVariant.
   - Created posts with media show the media thumbnail in the detail view.

5. **Publishing (from Phase 3)**:
   - For now, you may choose to **not actually send media** to the provider (add TODO) or handle basic image posts for Facebook. The important part of Phase 4 is storing and selecting media.

---

## 10. Instructions for Automated Coding Agents

- Do not add cloud storage dependencies (S3, Azure Blob, etc.) in this phase.
- Use exactly the config keys (`Media.RootPath`, `Media.BaseUrlPath`) described above.
- If metadata extraction (image size, video duration) is non-trivial, skip it and leave fields null with `TODO` comments.
- Do not modify existing post publishing logic beyond validating `MediaAssetId` and mapping the URL when sending to provider (if implemented).
- After finishing all tasks here, stop and wait for Phase 5 before implementing analytics or automation.

This completes the specification for **Phase 4 – Media Library and Basic Attachments**.