import crypto from "crypto";

const KEY = process.env.EASEBUZZ_KEY;
const SALT = process.env.EASEBUZZ_SALT;
const ENV = process.env.EASEBUZZ_ENV || "prod";

const BASE_URL =
  ENV === "prod"
    ? "https://pay.easebuzz.in/pay/secure"
    : "https://testpay.easebuzz.in/pay/secure";

export const createEasebuzzOrder = async ({
  amount,
  customer,
  orderId,
  description,
}) => {

  if (!KEY || !SALT) {
    throw new Error("Easebuzz ENV missing");
  }

  const txnid = orderId;

  const productinfo = "CoursePayment";

  const firstname = customer.name;
  const email = customer.email;
  const phone = customer.phone;

  const surl = `${process.env.FRONTEND_URL}/payment-success.html`;
  const furl = `${process.env.FRONTEND_URL}/payment-failed.html`;

  const hashString =
    KEY +
    "|" +
    txnid +
    "|" +
    amount +
    "|" +
    productinfo +
    "|" +
    firstname +
    "|" +
    email +
    "|||||||||||" +
    SALT;

  const hash = crypto
    .createHash("sha512")
    .update(hashString)
    .digest("hex");

  return {
    redirectUrl: BASE_URL,
    payload: {
      key: KEY,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
      hash,
    },
    orderId,
    transactionId: txnid,
  };
};