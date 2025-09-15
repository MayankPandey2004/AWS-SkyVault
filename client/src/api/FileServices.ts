const BASE_URL = "http://localhost:4000";

export interface FileResponse {
  fileName: string;
  size: number;
  mimeType: string;
  key: string;
  uploader: string;
  uploadDate: string;
}

export async function uploadFile(file: File, username: string): Promise<FileResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("username", username);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function listFiles(username: string): Promise<FileResponse[]> {
  const res = await fetch(`${BASE_URL}/files?username=${username}`);
  if (!res.ok) throw new Error("Failed to fetch files");
  return res.json();
}

export async function deleteFile(username: string, key: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/delete?username=${username}&key=${key}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Delete failed");
}

export function getDownloadUrl(username: string, key: string): string {
  return `${BASE_URL}/download?username=${username}&key=${key}`;
}
