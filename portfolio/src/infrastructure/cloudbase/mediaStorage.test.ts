import { describe, expect, it, vi } from 'vitest'
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES } from '../../domain/schemas'
import { CloudBaseMediaStorage, formatMediaUploadDiagnostic, MEDIA_UPLOAD_ERROR, type MediaUploadDiagnostic } from './mediaStorage'

function storageMock(result: unknown = {
  data: {
    id: 'cloud://env.bucket/media/photos/uuid.jpg',
    path: 'media/photos/uuid.jpg',
    fullPath: 'media/photos/uuid.jpg',
  },
  error: null,
}) {
  const upload = vi.fn().mockResolvedValue(result)
  const getPublicUrl = vi.fn().mockResolvedValue({ data: { publicUrl: 'https://assets.example.com/media/photos/uuid.jpg' } })
  const from = vi.fn().mockReturnValue({ upload, getPublicUrl })
  return { app: { storage: { from } }, from, upload, getPublicUrl }
}

function sizedFile(name: string, type: string, size = 1) {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('CloudBaseMediaStorage', () => {
  it('formats diagnostics as a readable allow-listed JSON line', () => {
    expect(formatMediaUploadDiagnostic({
      stage: 'upload',
      code: 'STORAGE_PERMISSION_DENIED',
      message: 'CloudBase 媒体上传失败',
    })).toBe('{"stage":"upload","code":"STORAGE_PERMISSION_DENIED","message":"CloudBase 媒体上传失败"}')
  })

  it.each([
    [new Error('Failed to create signed URL: [STORAGE_FILE_NOT_FOUND] cloud://private/path'), 'STORAGE_FILE_NOT_FOUND'],
    [new Error('bucketId is not set'), 'BUCKET_ID_NOT_SET'],
  ])('classifies known SDK errors without exposing their raw message', async (sourceError, expectedCode) => {
    const mock = storageMock()
    mock.getPublicUrl.mockResolvedValueOnce({ data: null, error: sourceError })
    const report = vi.fn<(event: MediaUploadDiagnostic) => void>()
    const storage = new CloudBaseMediaStorage(mock.app, () => 'safe-uuid', { enabled: true, report })

    await expect(storage.upload(sizedFile('photo.jpg', 'image/jpeg'), 'photos')).rejects.toThrow(MEDIA_UPLOAD_ERROR)
    expect(report).toHaveBeenCalledWith({
      stage: 'public-url',
      code: expectedCode,
      message: 'CloudBase 公开地址解析失败',
    })
    expect(JSON.stringify(report.mock.calls)).not.toContain('cloud://private/path')
    expect(JSON.stringify(report.mock.calls)).not.toContain('bucketId is not set')
  })

  it.each([
    ['videos', 'video/mp4', 'mp4'],
    ['covers', 'image/jpeg', 'jpg'],
    ['photos', 'image/png', 'png'],
    ['profile', 'image/webp', 'webp'],
    ['live', 'image/jpeg', 'jpg'],
    ['live', 'image/png', 'png'],
    ['live', 'image/webp', 'webp'],
    ['resume', 'application/pdf', 'pdf'],
    ['aigc-images', 'image/jpeg', 'jpg'],
    ['aigc-images', 'image/png', 'png'],
    ['aigc-images', 'image/webp', 'webp'],
    ['aigc-videos', 'video/mp4', 'mp4'],
  ])('uploads accepted %s media through the v3 storage surface', async (folder, mime, extension) => {
    const mock = storageMock()
    const storage = new CloudBaseMediaStorage(mock.app, () => '123e4567-e89b-12d3-a456-426614174000')
    await expect(storage.upload(sizedFile('../../unsafe.exe', mime), folder)).resolves.toEqual({
      id: 'cloud://env.bucket/media/photos/uuid.jpg', path: 'media/photos/uuid.jpg', fullPath: 'media/photos/uuid.jpg',
      url: 'https://assets.example.com/media/photos/uuid.jpg',
    })
    expect(mock.from).toHaveBeenCalledWith()
    expect(mock.upload).toHaveBeenCalledWith(
      `media/${folder}/123e4567-e89b-12d3-a456-426614174000.${extension}`,
      expect.any(File),
      { contentType: mime, upsert: false },
    )
    expect(mock.getPublicUrl).toHaveBeenCalledWith('cloud://env.bucket/media/photos/uuid.jpg')
  })

  it.each([
    ['unknown', 'image/jpeg', 1],
    ['videos', 'video/quicktime', 1],
    ['photos', 'image/gif', 1],
    ['live', 'video/mp4', 1],
    ['live', 'image/jpeg', IMAGE_MAX_BYTES + 1],
    ['resume', 'text/plain', 1],
    ['photos', 'image/jpeg', 0],
    ['photos', 'image/jpeg', IMAGE_MAX_BYTES + 1],
    ['videos', 'video/mp4', VIDEO_MAX_BYTES + 1],
    ['aigc-images', 'video/mp4', 1],
    ['aigc-images', 'image/jpeg', IMAGE_MAX_BYTES + 1],
    ['aigc-videos', 'image/jpeg', 1],
    ['aigc-videos', 'video/mp4', VIDEO_MAX_BYTES + 1],
  ])('rejects invalid folder/MIME/size before storage: %s %s %s', async (folder, mime, size) => {
    const mock = storageMock()
    const storage = new CloudBaseMediaStorage(mock.app)
    await expect(storage.upload(sizedFile('untrusted.name', mime, size), folder)).rejects.toThrow()
    expect(mock.from).not.toHaveBeenCalled()
    expect(mock.upload).not.toHaveBeenCalled()
  })

  it('does not derive extensions or path fragments from the user filename', async () => {
    const mock = storageMock()
    const storage = new CloudBaseMediaStorage(mock.app, () => 'safe-uuid')
    await storage.upload(sizedFile('../../secret.mp4', 'image/jpeg'), 'covers')
    expect(mock.upload.mock.calls[0]?.[0]).toBe('media/covers/safe-uuid.jpg')
  })

  it.each([
    { data: null, error: { message: 'backend leak' } },
    { data: null, error: null },
    { data: { id: '', path: '', fullPath: '' }, error: null },
  ])('converts storage failures into one safe upload error', async (result) => {
    const mock = storageMock(result)
    const storage = new CloudBaseMediaStorage(mock.app)
    await expect(storage.upload(sizedFile('photo.jpg', 'image/jpeg'), 'photos')).rejects.toThrow(MEDIA_UPLOAD_ERROR)
  })

  it('maps rejected upload requests to the stable upload error', async () => {
    const mock = storageMock()
    mock.upload.mockRejectedValueOnce(new Error('raw storage network detail'))
    const storage = new CloudBaseMediaStorage(mock.app)
    await expect(storage.upload(sizedFile('photo.jpg', 'image/jpeg'), 'photos')).rejects.toThrow(MEDIA_UPLOAD_ERROR)
  })

  it.each([
    { data: null, error: { message: 'private detail' } },
    { data: { publicUrl: '' } },
  ])('rejects upload completion when a safe public URL cannot be resolved', async (publicUrlResult) => {
    const mock = storageMock()
    mock.getPublicUrl.mockResolvedValueOnce(publicUrlResult)
    const storage = new CloudBaseMediaStorage(mock.app)
    await expect(storage.upload(sizedFile('photo.jpg', 'image/jpeg'), 'photos')).rejects.toThrow(MEDIA_UPLOAD_ERROR)
  })

  it('maps rejected public URL requests to the stable upload error', async () => {
    const mock = storageMock()
    mock.getPublicUrl.mockRejectedValueOnce(new Error('raw storage detail'))
    const storage = new CloudBaseMediaStorage(mock.app)
    await expect(storage.upload(sizedFile('photo.jpg', 'image/jpeg'), 'photos')).rejects.toThrow(MEDIA_UPLOAD_ERROR)
  })

  it('reports an allow-listed upload stage and code without leaking the source error', async () => {
    const mock = storageMock({
      data: null,
      error: {
        code: 'STORAGE_PERMISSION_DENIED',
        message: 'secret-token must never escape',
        authorization: 'Bearer private-token',
      },
    })
    const report = vi.fn<(event: MediaUploadDiagnostic) => void>()
    const storage = new CloudBaseMediaStorage(mock.app, () => 'safe-uuid', { enabled: true, report })

    await expect(storage.upload(sizedFile('photo.jpg', 'image/jpeg'), 'photos')).rejects.toThrow(MEDIA_UPLOAD_ERROR)
    expect(report).toHaveBeenCalledOnce()
    expect(report).toHaveBeenCalledWith({
      stage: 'upload',
      code: 'STORAGE_PERMISSION_DENIED',
      message: 'CloudBase 媒体上传失败',
    })
    expect(JSON.stringify(report.mock.calls)).not.toContain('secret-token')
    expect(JSON.stringify(report.mock.calls)).not.toContain('private-token')
  })

  it('reports public URL resolution separately and uses UNKNOWN for untrusted rejections', async () => {
    const mock = storageMock()
    mock.getPublicUrl.mockRejectedValueOnce({ message: 'private public URL detail', token: 'secret-token' })
    const report = vi.fn<(event: MediaUploadDiagnostic) => void>()
    const storage = new CloudBaseMediaStorage(mock.app, () => 'safe-uuid', { enabled: true, report })

    await expect(storage.upload(sizedFile('photo.jpg', 'image/jpeg'), 'photos')).rejects.toThrow(MEDIA_UPLOAD_ERROR)
    expect(report).toHaveBeenCalledWith({
      stage: 'public-url',
      code: 'UNKNOWN',
      message: 'CloudBase 公开地址解析失败',
    })
    expect(JSON.stringify(report.mock.calls)).not.toContain('secret-token')
    expect(JSON.stringify(report.mock.calls)).not.toContain('private public URL detail')
  })

  it('keeps diagnostics silent when disabled and on successful uploads', async () => {
    const failedMock = storageMock({ data: null, error: { code: 'DENIED', message: 'private detail' } })
    const disabledReport = vi.fn<(event: MediaUploadDiagnostic) => void>()
    const disabledStorage = new CloudBaseMediaStorage(failedMock.app, () => 'safe-uuid', { enabled: false, report: disabledReport })
    await expect(disabledStorage.upload(sizedFile('photo.jpg', 'image/jpeg'), 'photos')).rejects.toThrow(MEDIA_UPLOAD_ERROR)
    expect(disabledReport).not.toHaveBeenCalled()

    const successMock = storageMock()
    const successReport = vi.fn<(event: MediaUploadDiagnostic) => void>()
    const successStorage = new CloudBaseMediaStorage(successMock.app, () => 'safe-uuid', { enabled: true, report: successReport })
    await expect(successStorage.upload(sizedFile('photo.jpg', 'image/jpeg'), 'photos')).resolves.toMatchObject({
      id: 'cloud://env.bucket/media/photos/uuid.jpg',
      url: 'https://assets.example.com/media/photos/uuid.jpg',
    })
    expect(successReport).not.toHaveBeenCalled()
  })
})
