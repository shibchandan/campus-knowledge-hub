import crypto from "crypto";

function base32Decode(str) {
  if (typeof str !== "string") return Buffer.alloc(0);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = str.toUpperCase().replace(/=+$/, "");
  let bits = "";
  for (let i = 0; i < cleaned.length; i++) {
    const idx = alphabet.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error("Invalid base32 character in secret");
    }
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateSecret(length = 32) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const randomBytes = crypto.randomBytes(length);
  let secret = "";
  for (let i = 0; i < length; i++) {
    secret += alphabet[randomBytes[i] % 32];
  }
  return secret;
}

export function calculateToken(secret, counter) {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  
  let temp = BigInt(counter);
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = Number(temp & 0xffn);
    temp >>= 8n;
  }

  const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, "0");
}

export function verifyToken(secret, token, window = 1) {
  if (!token || token.length !== 6 || isNaN(token)) {
    return false;
  }
  
  const currentCounter = Math.floor(Date.now() / 1000 / 30);
  
  for (let i = -window; i <= window; i++) {
    try {
      const calculated = calculateToken(secret, currentCounter + i);
      if (calculated === token) {
        return true;
      }
    } catch {
      return false;
    }
  }
  
  return false;
}
