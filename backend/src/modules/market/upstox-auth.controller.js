const crypto = require("crypto");

const UPSTOX_AUTH_URL =
  "https://api.upstox.com/v2/login/authorization/dialog";

const UPSTOX_TOKEN_URL =
  "https://api.upstox.com/v2/login/authorization/token";

const pendingStates = new Map();

let accessToken = null;

const getConfig = () => {
  const {
    UPSTOX_CLIENT_ID,
    UPSTOX_CLIENT_SECRET,
    UPSTOX_REDIRECT_URI,
  } = process.env;

  if (
    !UPSTOX_CLIENT_ID ||
    !UPSTOX_CLIENT_SECRET ||
    !UPSTOX_REDIRECT_URI
  ) {
    throw new Error("Upstox environment variables are missing");
  }

  return {
    clientId: UPSTOX_CLIENT_ID,
    clientSecret: UPSTOX_CLIENT_SECRET,
    redirectUri: UPSTOX_REDIRECT_URI,
  };
};

const startAuthorization = (req, res) => {
  const { clientId, redirectUri } = getConfig();

  const state = crypto.randomBytes(32).toString("hex");

  pendingStates.set(state, Date.now() + 10 * 60 * 1000);

  const url = new URL(UPSTOX_AUTH_URL);

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  return res.redirect(url.toString());
};

const handleCallback = async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Upstox authorization was not completed",
    });
  }

  if (!code || !state || typeof state !== "string") {
    return res.status(400).json({
      success: false,
      message: "Missing authorization code or state",
    });
  }

  const expiresAt = pendingStates.get(state);
  pendingStates.delete(state);

  if (!expiresAt || expiresAt < Date.now()) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired OAuth state",
    });
  }

  const { clientId, clientSecret, redirectUri } = getConfig();

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(UPSTOX_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const result = await response.json();

  if (!response.ok || !result.access_token) {
    return res.status(502).json({
      success: false,
      message: "Upstox token exchange failed",
    });
  }

  accessToken = result.access_token;

  return res.status(200).json({
    success: true,
    message: "Upstox connected successfully",
  });
};

const getUpstoxAccessToken = () => accessToken;

module.exports = {
  startAuthorization,
  handleCallback,
  getUpstoxAccessToken,
};