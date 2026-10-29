/**
 * Login-link mail via SMTP of hi@thecrushguy.com on mail.datavallis.com (ADR-018).
 * Env: SMTP_HOST, SMTP_PORT (465 = implicit TLS, otherwise STARTTLS required), SMTP_USER, SMTP_PASSWORD, MAIL_FROM.
 * Local without SMTP_HOST: the link is printed to the server console instead (APP_ENV=local only).
 */
import nodemailer from "nodemailer";
import { appEnv } from "@/lib/env";
import type { Env } from "./config";
import type { SendLoginMail } from "./service";

export type SmtpConfig = { host: string; port: number; user?: string; password?: string; from: string };

export function smtpConfig(env: Env = process.env): SmtpConfig | null {
  if (!env.SMTP_HOST) return null;
  const port = Number(env.SMTP_PORT ?? 587);
  if (!Number.isInteger(port) || port <= 0) throw new Error("SMTP_PORT is not a valid port");
  if (!env.MAIL_FROM) throw new Error("MAIL_FROM is not set");
  return { host: env.SMTP_HOST, port, user: env.SMTP_USER, password: env.SMTP_PASSWORD, from: env.MAIL_FROM };
}

export function loginMailContent(link: string): { subject: string; text: string; html: string } {
  const subject = "Your sign-in link for The Crush Guy admin";
  const text = [
    "Use this link to sign in to The Crush Guy admin:",
    "",
    link,
    "",
    "It works once and expires in 15 minutes.",
    "If you did not ask for it, ignore this email — nothing happens without the link.",
  ].join("\n");
  const safe = link.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const html = `<p>Use this link to sign in to The Crush Guy admin:</p><p><a href="${safe}">Sign in</a></p><p>It works once and expires in 15 minutes.<br>If you did not ask for it, ignore this email — nothing happens without the link.</p>`;
  return { subject, text, html };
}

export function createSmtpSender(cfg: SmtpConfig): SendLoginMail {
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    requireTLS: cfg.port !== 465 && cfg.host !== "localhost" && cfg.host !== "127.0.0.1",
    auth: cfg.user ? { user: cfg.user, pass: cfg.password ?? "" } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return async (to, link) => {
    await transport.sendMail({ from: cfg.from, to, ...loginMailContent(link) });
  };
}

/** Sender for the current environment. Missing SMTP config outside local fails loud at send time. */
export function loginMailSender(): SendLoginMail {
  let cfg: SmtpConfig | null;
  try {
    cfg = smtpConfig();
  } catch (err) {
    // Half-configured SMTP: fail at send time so the request path logs it like any other mail failure.
    return async () => {
      throw err;
    };
  }
  if (cfg) return createSmtpSender(cfg);
  if (appEnv() === "local") {
    return async (_to, link) => {
      console.log(`[auth] SMTP_HOST not set (local) — sign-in link: ${link}`);
    };
  }
  return async () => {
    throw new Error("SMTP_HOST is not set");
  };
}
