import axios from "axios";

export const BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

function getAuthToken() {
  return localStorage.getItem("slidecast_token");
}

function withAuthHeaders(headers = {}) {
  const token = getAuthToken();
  if (!token) return headers;
  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

export async function signupUser(fullName, email, password) {
  const res = await axios.post(
    `${BASE_URL}/auth/signup`,
    {
      full_name: fullName,
      email,
      password,
    },
    {
      headers: { "Content-Type": "application/json" },
    }
  );
  return res.data;
}

export async function loginUser(email, password) {
  const res = await axios.post(
    `${BASE_URL}/auth/login`,
    {
      email,
      password,
    },
    {
      headers: { "Content-Type": "application/json" },
    }
  );
  return res.data;
}

export async function uploadAndProcessPPT(file, slideCount, role, lang = "en") {
  const formData = new FormData();
  formData.append("file", file);

  const uploadRes = await axios.post(`${BASE_URL}/upload-ppt`, formData, {
    headers: withAuthHeaders({ "Content-Type": "multipart/form-data" }),
  });

  const processRes = await axios.post(
    `${BASE_URL}/process-ppt`,
    {
      file_path: uploadRes.data.file_path,
      slide_count: Number(slideCount),
      role: role || "teacher",
      lang,
    },
    {
      headers: withAuthHeaders({ "Content-Type": "application/json" }),
    }
  );

  return processRes.data;
}

export async function regenerateAudio(sessionId, role, lang = "en", teamMembers = []) {
  const res = await axios.post(
    `${BASE_URL}/regenerate-audio`,
    {
      session_id: sessionId,
      role: role || "teacher",
      lang,
      team_members: teamMembers,
    },
    {
      headers: withAuthHeaders({ "Content-Type": "application/json" }),
    }
  );

  return res.data;
}

export async function askQuestion(sessionId, question) {
  const res = await fetch(`${BASE_URL}/ask`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ session_id: sessionId, question }),
  });

  const data = await res.json();
  if (!res.ok) {
    const message = data?.error || "Ask failed";
    throw new Error(message);
  }
  return data;
}

export async function getPresentationNotes(sessionId) {
  const res = await axios.get(`${BASE_URL}/presentation/${sessionId}/notes`, {
    headers: withAuthHeaders(),
  });
  return res.data;
}

export async function savePresentationNote(sessionId, slideIndex, noteText) {
  const res = await axios.post(
    `${BASE_URL}/presentation/${sessionId}/notes`,
    {
      slide_index: slideIndex,
      note_text: noteText,
    },
    {
      headers: withAuthHeaders({ "Content-Type": "application/json" }),
    }
  );
  return res.data;
}

export async function downloadPresentationNotes(sessionId) {
  const res = await axios.get(`${BASE_URL}/presentation/${sessionId}/notes/download`, {
    headers: withAuthHeaders(),
    responseType: "blob",
  });
  return res.data;
}

export async function deletePresentationNote(sessionId, noteId) {
  const res = await axios.delete(`${BASE_URL}/presentation/${sessionId}/notes/${noteId}`, {
    headers: withAuthHeaders(),
  });
  return res.data;
}

export async function getPresentationSummary(sessionId) {
  const res = await axios.get(`${BASE_URL}/presentation/${sessionId}/summary`, {
    headers: withAuthHeaders(),
  });
  return res.data;
}

export async function savePresentationSummary(sessionId, summaryText) {
  const res = await axios.post(
    `${BASE_URL}/presentation/${sessionId}/summary`,
    { summary_text: summaryText },
    { headers: withAuthHeaders({ "Content-Type": "application/json" }) }
  );
  return res.data;
}

export async function downloadPresentationSummary(sessionId) {
  const res = await axios.get(`${BASE_URL}/presentation/${sessionId}/summary/download`, {
    headers: withAuthHeaders(),
    responseType: "blob",
  });
  return res.data;
}

export async function downloadPresentation(sessionId) {
  const res = await axios.get(`${BASE_URL}/presentation/${sessionId}/download`, {
    headers: withAuthHeaders(),
    responseType: "blob",
  });
  return res.data;
}
