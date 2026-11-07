import crypto from "crypto";
import { HttpError } from "./httpError.js";

const MOMO_SANDBOX_URL = "https://test-payment.momo.vn/v2/gateway/api";

function generateSignature(data, secretKey) {
  const rawData = Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("&");
  return crypto.createHmac("sha256", secretKey).update(rawData).digest("hex");
}

export const momoService = {
  // Provisioning: Create API User (Sandbox only)
  createApiUser: async (subscriptionKey, callbackHost) => {
    const referenceId = crypto.randomUUID();
    const response = await fetch(`${MOMO_SANDBOX_URL}/apiuser`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Reference-Id": referenceId,
        "Ocp-Apim-Subscription-Key": subscriptionKey
      },
      body: JSON.stringify({ providerCallbackHost: callbackHost })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new HttpError(500, `Failed to create MoMo API user: ${error}`);
    }
    return { referenceId, userId: referenceId };
  },

  // Provisioning: Create API Key (Sandbox only)
  createApiKey: async (subscriptionKey, userId) => {
    const response = await fetch(`${MOMO_SANDBOX_URL}/apiuser/${userId}/apikey`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": subscriptionKey
      }
    });
    if (!response.ok) {
      const error = await response.text();
      throw new HttpError(500, `Failed to create MoMo API key: ${error}`);
    }
    const data = await response.json();
    return data.apiKey;
  },

  // OAuth 2.0: Get Access Token
  getAccessToken: async (apiUser, apiKey) => {
    const auth = Buffer.from(`${apiUser}:${apiKey}`).toString("base64");
    const response = await fetch(`${MOMO_SANDBOX_URL}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        scope: "payment"
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new HttpError(500, `Failed to get MoMo access token: ${error}`);
    }
    const data = await response.json();
    return data.access_token;
  },

  // Request Payment
  requestPayment: async (accessToken, partnerCode, accessKey, secretKey, orderInfo) => {
    const { amount, orderId, orderInfo: orderInfoText, returnUrl, notifyUrl } = orderInfo;
    
    const request = {
      partnerCode,
      partnerName: "STAYORA",
      storeId: "STAYORA",
      requestId: crypto.randomUUID(),
      amount: amount.toString(),
      orderInfo: orderInfoText,
      orderType: "momo_wallet",
      extraData: "",
      requestType: "captureWallet",
      signature: "",
      lang: "vi"
    };

    // Generate signature (without signature field)
    const rawData = `accessKey=${accessKey}&amount=${request.amount}&extraData=${request.extraData}&lang=${request.lang}&orderId=${request.requestId}&orderInfo=${request.orderInfo}&orderType=${request.orderType}&partnerCode=${partnerCode}&partnerName=${request.partnerName}&requestType=${request.requestType}&storeId=${request.storeId}&requestId=${request.requestId}`;
    request.signature = crypto.createHmac("sha256", secretKey).update(rawData).digest("hex");

    const response = await fetch(`${MOMO_SANDBOX_URL}/request-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new HttpError(500, `Failed to request MoMo payment: ${error}`);
    }

    const data = await response.json();
    return {
      requestId: request.requestId,
      qrCode: data.qrCode,
      deeplink: data.deeplink,
      shortLink: data.shortLink
    };
  },

  // Check Payment Status
  checkPaymentStatus: async (accessToken, partnerCode, accessKey, secretKey, requestId) => {
    const request = {
      partnerCode,
      requestId,
      lang: "vi"
    };

    const rawData = `accessKey=${accessKey}&lang=${request.lang}&partnerCode=${partnerCode}&requestId=${request.requestId}`;
    const signature = crypto.createHmac("sha256", secretKey).update(rawData).digest("hex");

    const response = await fetch(`${MOMO_SANDBOX_URL}/query/${requestId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({ ...request, signature })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new HttpError(500, `Failed to check MoMo payment status: ${error}`);
    }

    const data = await response.json();
    return {
      status: data.status, // PENDING, SUCCESSFUL, FAILED
      amount: data.amount,
      transId: data.transId
    };
  }
};
