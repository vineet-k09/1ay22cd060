import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const LOG_API_URL = process.env.LOG_API_URL || "http://20.244.56.144/evaluation-service/logs"
const BEARER_TOKEN = process.env.LOG_BEARER_TOKEN; 

export default async function Log(
  stack: string,
  level: string,
  packageName: string,
  message: string
) 
{
  if (!BEARER_TOKEN) {
    console.warn('Bearer token missing in env, cannot log');
    return;
  }

  const requestBody = {
    stack,
    level,
    package: packageName,
    message,
  };

  try {
    const response = await axios.post(LOG_API_URL, requestBody, {
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log("Log Success:", response.data);
  } catch (error: any) {
    console.error("Log Failed:", error.message? error.message: "");
  }
}
