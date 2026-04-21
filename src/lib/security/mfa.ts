import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";

export const generateMfaSecret = () => new Secret({ size: 20 }).base32;

export const buildTotp = (secret: string, label: string, issuer = "RestoFlow") =>
  new TOTP({ issuer, label, algorithm: "SHA1", digits: 6, period: 30, secret: Secret.fromBase32(secret) });

export const getOtpAuthUrl = (secret: string, label: string, issuer = "RestoFlow") =>
  buildTotp(secret, label, issuer).toString();

export const getQrDataUrl = async (otpAuthUrl: string) =>
  await QRCode.toDataURL(otpAuthUrl, { width: 240, margin: 1 });

export const verifyTotp = (secret: string, token: string) => {
  try {
    const totp = buildTotp(secret, "verify");
    const delta = totp.validate({ token: token.replace(/\s/g, ""), window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
};

export const generateBackupCodes = (count = 8) => {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = Array.from(crypto.getRandomValues(new Uint8Array(5)))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
    codes.push(raw.slice(0, 4) + "-" + raw.slice(4, 8));
  }
  return codes;
};