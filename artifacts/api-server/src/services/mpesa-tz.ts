/**
 * Vodacom Tanzania M-Pesa API — Transaction Status Verification
 *
 * Documentation: https://openapiportal.m-pesa.com
 *
 * Required environment secrets (set in Replit Secrets):
 *   MPESA_TZ_API_KEY      — your API key from the M-Pesa TZ developer portal
 *   MPESA_TZ_PUBLIC_KEY   — RSA public key provided by Vodacom TZ (base64 PEM or raw)
 *   MPESA_TZ_SHORTCODE    — your registered business shortcode / PayBill number
 *
 * How the auth works:
 *   1. RSA-encrypt your API_KEY using the Vodacom-provided PUBLIC_KEY (PKCS1 v1.5 padding)
 *   2. Base64-encode the result → this becomes the Bearer token
 *   3. Send that token in the Authorization header on every request
 *
 * Transaction Status Query returns whether the transaction:
 *   - Succeeded / failed
 *   - The exact amount
 *   - The payer's MSISDN (phone number)
 *   - The timestamp
 */

import * as crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MpesaVerifyResult =
  | { verified: true;  amount: number; phone: string; txId: string; timestamp: string }
  | { verified: false; reason: string };

interface MpesaTzQueryResponse {
  output_ResponseCode:           string; // "INS-0" = success
  output_ResponseDesc:           string;
  output_ConversationID?:        string;
  output_FaultCode?:             string;
  output_FaultDesc?:             string;
  output_TransactionAmount?:     string;
  output_MSISDN?:                string;
  output_TransactionDate?:       string;
  output_ThirdPartyConversationID?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a short unique conversation ID for each API call.
 */
function conversationId(): string {
  return `BETPESAA-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * Build the Bearer token:  RSA-encrypt(API_KEY, PUBLIC_KEY) → base64
 *
 * Vodacom's public key is provided as a raw base64-encoded DER, without
 * the PEM headers. We wrap it ourselves before using Node's crypto.
 */
function buildBearerToken(apiKey: string, rawPublicKey: string): string {
  // Add PEM wrapper if not already present
  let pem = rawPublicKey.trim();
  if (!pem.startsWith("-----BEGIN")) {
    // strip any newlines in the raw key then wrap
    const b64 = pem.replace(/\s+/g, "");
    pem = `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g)!.join("\n")}\n-----END PUBLIC KEY-----`;
  }

  const encrypted = crypto.publicEncrypt(
    { key: pem, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(apiKey, "utf8"),
  );

  return encrypted.toString("base64");
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Verify a Tanzania M-Pesa transaction reference against the live Vodacom API.
 *
 * Returns `{ verified: true, amount, phone, txId, timestamp }` on success.
 * Returns `{ verified: false, reason }` on failure (bad ref, wrong amount, etc.)
 *
 * If the environment variables are not configured this throws so the caller
 * can fall back gracefully.
 */
export async function verifyMpesaTzTransaction(
  txId: string,
  expectedAmount?: number,
): Promise<MpesaVerifyResult> {
  const apiKey    = process.env.MPESA_TZ_API_KEY;
  const publicKey = process.env.MPESA_TZ_PUBLIC_KEY;
  const shortcode = process.env.MPESA_TZ_SHORTCODE;

  if (!apiKey || !publicKey || !shortcode) {
    throw new Error("MPESA_TZ_NOT_CONFIGURED");
  }

  const bearerToken = buildBearerToken(apiKey, publicKey);

  // Vodacom TZ: sandbox vs production — flip the hostname for production
  const isSandbox = process.env.MPESA_TZ_ENV !== "production";
  const baseUrl   = isSandbox
    ? "https://sandbox.m-pesa.com"
    : "https://openapi.m-pesa.com";

  const thirdPartyId = conversationId();
  const params = new URLSearchParams({
    input_QueryReference:            txId,
    input_ServiceProviderCode:       shortcode,
    input_ThirdPartyConversationID:  thirdPartyId,
    input_Country:                   "TZA",
    input_Language:                  "EN",
  });

  const url = `${baseUrl}/ipg/v2/vodacomTZN/queryTransactionStatus/?${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
        "Content-Type":  "application/json",
        "Origin":        "developer.vodacom.com",
      },
      signal: AbortSignal.timeout(10_000), // 10-second timeout
    });
  } catch (err: any) {
    return { verified: false, reason: `API unreachable: ${err.message}` };
  }

  let body: MpesaTzQueryResponse;
  try {
    body = await response.json() as MpesaTzQueryResponse;
  } catch {
    return { verified: false, reason: "Invalid response from M-Pesa API" };
  }

  // "INS-0" is the Vodacom success code; anything else is a failure
  if (body.output_ResponseCode !== "INS-0") {
    const reason = body.output_ResponseDesc
      || body.output_FaultDesc
      || `M-Pesa error code: ${body.output_ResponseCode}`;
    return { verified: false, reason };
  }

  const amount = parseFloat(body.output_TransactionAmount ?? "0");
  const phone  = body.output_MSISDN ?? "";

  // Optional: cross-check the amount matches what the user declared
  if (expectedAmount !== undefined && Math.abs(amount - expectedAmount) > 1) {
    return {
      verified: false,
      reason: `Amount mismatch: API reports TZS ${amount.toLocaleString()} but you declared TZS ${expectedAmount.toLocaleString()}`,
    };
  }

  return {
    verified:  true,
    amount,
    phone,
    txId,
    timestamp: body.output_TransactionDate ?? new Date().toISOString(),
  };
}

/**
 * Returns true only when all three M-Pesa TZ env vars are present.
 * Used by the deposits route to decide whether to attempt live verification.
 */
export function isMpesaConfigured(): boolean {
  return !!(
    process.env.MPESA_TZ_API_KEY &&
    process.env.MPESA_TZ_PUBLIC_KEY &&
    process.env.MPESA_TZ_SHORTCODE
  );
}
