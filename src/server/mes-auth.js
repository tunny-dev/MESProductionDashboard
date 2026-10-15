import { Buffer } from 'node:buffer';
import process from 'node:process';

const DEFAULT_MES_AUTH_URL = 'http://10.1.200.31/MES/auth';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_048_576;

function sendJson(response, status, payload) {
  response.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}

function parseRequestBody(body) {
  if (Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString('utf8'));
    } catch {
      return null;
    }
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  return body && typeof body === 'object' ? body : null;
}

function rewriteSessionCookie(cookie) {
  const [nameValue, ...attributes] = cookie.split(';').map((part) => part.trim());
  const forwardedAttributes = attributes.filter(
    (attribute) =>
      !/^domain=/i.test(attribute) &&
      !/^path=/i.test(attribute) &&
      !/^samesite=/i.test(attribute) &&
      !/^secure$/i.test(attribute) &&
      !/^httponly$/i.test(attribute)
  );

  forwardedAttributes.push('Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax');
  return [nameValue, ...forwardedAttributes].join('; ');
}

async function readLimitedResponse(response) {
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new Error('MES response is too large');
  }

  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error('MES response is too large');
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { message: 'Method not allowed' });
  }

  const body = parseRequestBody(request.body);
  const username = body?.username;
  const password = body?.password;

  if (
    typeof username !== 'string' ||
    username.length === 0 ||
    username.length > 128 ||
    typeof password !== 'string' ||
    password.length === 0 ||
    password.length > 2_048
  ) {
    return sendJson(response, 400, { message: 'Invalid login request' });
  }

  let mesAuthUrl;
  try {
    mesAuthUrl = new URL(process.env.MES_AUTH_URL || DEFAULT_MES_AUTH_URL);
    if (!['http:', 'https:'].includes(mesAuthUrl.protocol)) throw new Error('Invalid protocol');
  } catch {
    return sendJson(response, 500, { message: 'MES authentication proxy is misconfigured' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let mesResponse;

  try {
    mesResponse = await fetch(mesAuthUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, company: '' }),
      signal: controller.signal,
      redirect: 'manual',
    });
  } catch (error) {
    return sendJson(response, error?.name === 'AbortError' ? 504 : 502, {
      message: 'MES authentication service is unavailable',
    });
  } finally {
    clearTimeout(timeout);
  }

  try {
    const responseBody = await readLimitedResponse(mesResponse);
    response.status(mesResponse.status);
    response.setHeader(
      'Content-Type',
      mesResponse.headers.get('content-type') || 'application/json; charset=utf-8'
    );
    const authorization = mesResponse.headers.get('authorization');
    if (authorization) response.setHeader('Authorization', authorization);

    const cookies = mesResponse.headers.getSetCookie?.() ?? [];
    const fallbackCookie = mesResponse.headers.get('set-cookie');
    const forwardedCookies = cookies.length > 0 ? cookies : fallbackCookie ? [fallbackCookie] : [];
    if (forwardedCookies.length > 0) {
      response.setHeader('Set-Cookie', forwardedCookies.map(rewriteSessionCookie));
    }

    return response.end(responseBody);
  } catch {
    return sendJson(response, 502, { message: 'MES returned an invalid response' });
  }
}
