import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startSmtpCatcher } from "../../../test/smtp-catcher";
import { createSmtpSender, loginMailSender, smtpConfig } from "./mail";

let catcher: Awaited<ReturnType<typeof startSmtpCatcher>>;
beforeAll(async () => {
  catcher = await startSmtpCatcher();
});
afterAll(async () => {
  await catcher.close();
});

describe("SMTP login mail (real nodemailer transport against an in-process SMTP server)", () => {
  it("delivers the link from MAIL_FROM to the admin, authenticating with SMTP_USER", async () => {
    const cfg = smtpConfig({
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(catcher.port),
      SMTP_USER: "hi@thecrushguy.test",
      SMTP_PASSWORD: "test-only",
      MAIL_FROM: "The Crush Guy <hi@thecrushguy.test>",
    })!;
    const link = "https://dev.thecrushguy.com/admin/auth/verify?token=AbC_123";
    await createSmtpSender(cfg)("owner@example.com", link);

    expect(catcher.messages).toHaveLength(1);
    const m = catcher.messages[0]!;
    expect(m.from).toBe("hi@thecrushguy.test");
    expect(m.to).toEqual(["owner@example.com"]);
    expect(m.authUser).toBe("hi@thecrushguy.test");
    expect(m.data).toMatch(/^Subject: Your sign-in link for The Crush Guy admin$/m);
    // Body parts are quoted-printable: undo soft line breaks and =XX escapes before matching.
    const decoded = Buffer.from(
      m.data.replace(/=\n/g, "").replace(/=([0-9A-F]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16))),
      "latin1",
    ).toString("utf8");
    expect(decoded).toContain(`\n${link}\n`);
    expect(decoded).toContain(`href="${link}"`);
  });

  it("outside local, a missing SMTP_HOST makes sending fail (never silently drops the mail)", async () => {
    const saved = { ...process.env };
    try {
      delete process.env.SMTP_HOST;
      process.env.APP_ENV = "dev";
      await expect(loginMailSender()("owner@example.com", "https://x")).rejects.toThrow("SMTP_HOST is not set");
    } finally {
      process.env = saved;
    }
  });
});
