import axios from "axios";
import qs from "qs";

const API_KEY = process.env.INSTAMOJO_API_KEY;
const AUTH_TOKEN = process.env.INSTAMOJO_AUTH_TOKEN;
const URL = process.env.INSTAMOJO_URL;

export const createInstamojoOrder = async ({
  amount,
  customer,
  orderId,
  description,
}) => {
  try {

    if (!API_KEY || !AUTH_TOKEN || !URL) {
      throw new Error("Instamojo ENV missing");
    }

    const payload = qs.stringify({
      purpose: description,
      amount: amount,
      buyer_name: customer.name,
      email: customer.email,
      phone: customer.phone,
      redirect_url: `${process.env.FRONTEND_URL}/courses`,
      allow_repeated_payments: false,
    });

    const response = await axios.post(
      URL,
      payload,
      {
        headers: {
          "X-Api-Key": API_KEY,
          "X-Auth-Token": AUTH_TOKEN,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const data = response.data;

    if (!data.success) {
      throw new Error("Instamojo failed");
    }

    return {
      orderId,
      transactionId: data.payment_request.id,
      redirectUrl: data.payment_request.longurl,
      status: "created",
    };

  } catch (error) {

    console.log("INSTAMOJO ERROR:", error.response?.data || error.message);

    throw new Error(
      error.response?.data?.message ||
      error.message ||
      "Instamojo error"
    );
  }
};