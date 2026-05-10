import { google } from 'googleapis'
import { Readable } from 'stream'

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
)
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
const drive = google.drive({ version: 'v3', auth })

const folderCache = new Map<string, string>()

export async function getOrCreateFolder(name: string, parentId: string): Promise<string> {
  const key = `${parentId}/${name}`
  if (folderCache.has(key)) return folderCache.get(key)!
  const res = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)', spaces: 'drive'
  })
  if (res.data.files && res.data.files.length > 0) {
    const id = res.data.files[0].id!
    folderCache.set(key, id)
    return id
  }
  const folder = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id'
  })
  folderCache.set(key, folder.data.id!)
  return folder.data.id!
}

export async function uploadFile(
  buffer: Buffer, filename: string, mimeType: string, folderId: string
): Promise<{ fileId: string; webViewLink: string }> {
  const res = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id,webViewLink'
  })
  await drive.permissions.create({
    fileId: res.data.id!,
    requestBody: { role: 'reader', type: 'anyone' }
  })
  return {
    fileId: res.data.id!,
    webViewLink: res.data.webViewLink || `https://drive.google.com/file/d/${res.data.id}/view`
  }
}

export async function deleteFile(fileId: string): Promise<void> {
  await drive.files.delete({ fileId }).catch(() => {})
}
