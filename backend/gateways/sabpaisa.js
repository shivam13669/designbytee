import crypto from "crypto";
import { logger } from "../utils/logger.js";

/*
SabPaisa Gateway (Form + Encryption mode)
Works with your existing checkout-script.js
Does NOT affect other gateways
*/

const SABPAISA_CLIENT_CODE = process.env.SABPAISA_CLIENT_CODE;
const SABPAISA_USERNAME = process.env.SABPAISA_USERNAME;
const SABPAISA_PASSWORD = process.env.SABPAISA_PASSWORD;
const SABPAISA_AUTH_KEY = process.env.SABPAISA_AUTH_KEY;
const SABPAISA_AUTH_IV = process.env.SABPAISA_AUTH_IV;

const SABPAISA_URL =
  process.env.SABPAISA_URL ||
  "https://securepay.sabpaisa.in/SabPaisa/sabPaisaInit?v=1";



/* =====================================================
   ENCRYPT FUNCTION
===================================================== */

function encryptSabPaisa(text) {

  const key = Buffer.from(process.env.SABPAISA_AUTH_KEY, "utf8").slice(0, 32);
  const iv = Buffer.from(process.env.SABPAISA_AUTH_IV, "utf8").slice(0, 16);

  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    key,
    iv
  );

  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");

  return encrypted;
}

/* =====================================================
   CREATE ORDER
===================================================== */

export const createSabPaisaOrder = async ({
  amount,
  currency = "INR",
  customer,
  orderId,
  description,
}) => {
  try {
    logger.info("Creating SabPaisa order", {
      amount,
      orderId,
      customer: customer?.email,
    });

    if (
      !SABPAISA_CLIENT_CODE ||
      !SABPAISA_USERNAME ||
      !SABPAISA_PASSWORD ||
      !SABPAISA_AUTH_KEY ||
      !SABPAISA_AUTH_IV
    ) {
      throw new Error("SabPaisa ENV not set");
    }

    const txnId = `TXN_${Date.now()}`;


const transDate = new Date().getTime();

const stringForRequest =
  "payerName=" + customer.name +
  "&payerEmail=" + customer.email +
  "&payerMobile=" + customer.phone +
  "&clientTxnId=" + txnId +
  "&amount=" + amount +
  "&clientCode=" + SABPAISA_CLIENT_CODE +
  "&transUserName=" + SABPAISA_USERNAME +
  "&transUserPassword=" + SABPAISA_PASSWORD +
  "&callbackUrl=" + process.env.BACKEND_URL + "/api/payment/sabpaisa-callback" +
  "&channelId=W" +
  "&mcc=5666" +
  "&transDate=" + transDate;


console.log("STRING =", stringForRequest);

const encData = encryptSabPaisa(stringForRequest);

    logger.info("SabPaisa encrypted", {
      txnId,
    });

    return {
      orderId,
      transactionId: txnId,

      redirectUrl: SABPAISA_URL,

      payload: {
        encData: encData,
        clientCode: SABPAISA_CLIENT_CODE.trim(),
        channelId: "W",
      },

      amount,
      currency,
      status: "created",
    };
  } catch (error) {
    logger.error("SabPaisa order error", error);
    throw error;
  }
};



/* =====================================================
   VERIFY (optional)
===================================================== */

export const getSabPaisaPaymentStatus = async (transactionId) => {
  return {
    success: true,
    transactionId,
  };
};



/* =====================================================
   WEBHOOK (optional)
===================================================== */

export const handleSabPaisaWebhook = async (data) => {
  return {
    processed: true,
    data,
  };
};



/* =====================================================
   EXPORT
===================================================== */

export default {
  createSabPaisaOrder,
  getSabPaisaPaymentStatus,
  handleSabPaisaWebhook,
};