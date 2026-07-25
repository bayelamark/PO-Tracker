const AUTH_TOKEN_KEY = "poTrackerAuthToken";
const AUTH_USER_KEY = "poTrackerUser";

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getLoggedInUser() {
  const savedUser = localStorage.getItem(AUTH_USER_KEY);

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch (error) {
    return null;
  }
}

function saveLogin(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(
    AUTH_USER_KEY,
    JSON.stringify(user)
  );
}

function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  window.location.href = "login.html";
}

function requireLogin() {
  if (!getAuthToken()) {
    window.location.href = "login.html";
    return false;
  }

  return true;
}

function getAuthHeaders(includeJson = true) {
  const headers = {};
  const token = getAuthToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}