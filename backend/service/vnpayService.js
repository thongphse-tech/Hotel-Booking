import crypto from "crypto";
import { HttpError } from "./httpError.js";

const VNPAY_SANDBOX_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

function generateHashSecret(orderInfo, amount, tmnCode, secretKey) {
  const rawData = `${amount}|orderInfo|${tmnCode}`;
  return crypto.createHmac("sha512", secretKey).update(rawData).digest("hex");
}

export const vnpayService = {
  createPayment: async (tmnCode, hashSecret, amount, orderId, orderInfo, returnUrl, bankCode) => {
    const now = new Date();
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${year}${month}${day}${hours}${minutes}${seconds}`;
    };

    const createDate = formatDate(now);
    const expireDate = formatDate(new Date(Date.now() + 15 * 60 * 1000));

    const requestData = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Amount: (amount * 100).toString(),
      vnp_CreateDate: createDate,
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: "127.0.0.1",
      vnp_ExpireDate: expireDate,
      vnp_BankCode: bankCode || "",
      vnp_Locale: "vn"
    };

    const signData = Object.keys(requestData)
      .sort()
      .map((key) => `${key}=${requestData[key]}`)
      .join("&");
    requestData.vnp_SecureHash = crypto.createHmac("sha512", hashSecret).update(signData).digest("hex");

    const redirectUrl = `${VNPAY_SANDBOX_URL}?${new URLSearchParams(requestData).toString()}`;
    return redirectUrl;
  },

  verifyCallback: async (vnp_SecureHash, tmnCode, hashSecret, params) => {
    const { vnp_TxnRef, vnp_Amount, vnp_ResponseCode, vnp_TransactionStatus } = params;
    
    const signData = Object.keys(params)
      .filter(key => key !== "vnp_SecureHash")
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");
    const calculatedHash = crypto.createHmac("sha512", hashSecret).update(signData).digest("hex");

    if (calculatedHash !== vnp_SecureHash) {
      throw new HttpError(400, "Invalid VNPay signature");
    }

    if (vnp_ResponseCode === "00" && vnp_TransactionStatus === "00") {
      return { success: true, txnRef: vnp_TxnRef, amount: vnp_Amount };
    }

    return { success: false, status: vnp_TransactionStatus };
  }
};
