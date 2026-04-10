import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const LOGIN_URL = "https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword";
const QUOTE_URL = "https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/";

const config = {
  apiKey: process.env.ANGEL_API_KEY,
  clientId: process.env.ANGEL_CLIENT_ID,
  password: process.env.ANGEL_PASSWORD,
  totp: process.env.ANGEL_TOTP,
  sourceId: process.env.ANGEL_SOURCE_ID || "WEB",
  userType: process.env.ANGEL_USER_TYPE || "USER",
  clientLocalIp: process.env.ANGEL_CLIENT_LOCAL_IP || "127.0.0.1",
  clientPublicIp: process.env.ANGEL_CLIENT_PUBLIC_IP,
  macAddress: process.env.ANGEL_CLIENT_MAC,
  exchange: process.env.ANGEL_EXCHANGE || "NSE",
  tokenList: (process.env.ANGEL_EXCHANGE_TOKENS || "3045")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean),
};

function validateConfig() {
  const required = [
    ["ANGEL_API_KEY", config.apiKey],
    ["ANGEL_CLIENT_ID", config.clientId],
    ["ANGEL_PASSWORD", config.password],
    ["ANGEL_TOTP", config.totp],
    ["ANGEL_CLIENT_PUBLIC_IP", config.clientPublicIp],
    ["ANGEL_CLIENT_MAC", config.macAddress],
  ];

  const missing = required.filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

async function login() {
  try {
    const response = await axios.post(
      LOGIN_URL,
      {
        clientcode: config.clientId,
        password: config.password,
        totp: config.totp,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-PrivateKey": config.apiKey,
        },
      }
    );

    const jwtToken = response.data?.data?.jwtToken;
    if (!jwtToken) {
      throw new Error("JWT token missing in login response");
    }

    console.log("Login Success");
    return jwtToken;
  } catch (error) {
    console.error("Login Error", error.response?.data || error.message);
    return null;
  }
}

async function getMarketData(token) {
  try {
    const response = await axios.post(
      QUOTE_URL,
      {
        mode: "FULL",
        exchangeTokens: {
          [config.exchange]: config.tokenList,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-PrivateKey": config.apiKey,
          "X-SourceID": config.sourceId,
          "X-ClientLocalIP": config.clientLocalIp,
          "X-ClientPublicIP": config.clientPublicIp,
          "X-MACAddress": config.macAddress,
          "X-UserType": config.userType,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Market Data");
    console.log(JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error) {
    console.error("Market API Error", error.response?.data || error.message);
    return null;
  }
}

export async function start() {
  try {
    validateConfig();

    const token = await login();
    if (!token) return;

    await getMarketData(token);
  } catch (error) {
    console.error(error.message);
  }
}

start();
