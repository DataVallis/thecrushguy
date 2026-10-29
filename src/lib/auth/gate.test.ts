import { describe, expect, it } from "vitest";
import { adminEmails, isAdminEmail, SESSION_COOKIE } from "./config";
import { adminGateRedirect } from "./gate";
import { smtpConfig, loginMailContent } from "./mail";

describe("adminGateRedirect (proxy early redirect)", () => {
  it("sends anonymous requests for protected admin paths to the login page", () => {
    for (const p of ["/admin", "/admin/", "/admin/apps", "/admin/apps/1/edit"]) {
      expect(adminGateRedirect(p, [])).toBe("/admin/login");
      expect(adminGateRedirect(p, ["other_cookie"])).toBe("/admin/login");
    }
  });

  it("lets the login and verify pages through without a session", () => {
    expect(adminGateRedirect("/admin/login", [])).toBeNull();
    expect(adminGateRedirect("/admin/auth/verify", [])).toBeNull();
  });

  it("does not treat look-alike paths as public", () => {
    expect(adminGateRedirect("/admin/login/../apps", [])).toBe("/admin/login");
    expect(adminGateRedirect("/admin/loginx", [])).toBe("/admin/login");
    expect(adminGateRedirect("/admin/auth/verify/extra", [])).toBe("/admin/login");
  });

  it("passes requests with a session cookie (the page then validates it on the server)", () => {
    expect(adminGateRedirect("/admin", [SESSION_COOKIE])).toBeNull();
  });

  it("ignores non-admin paths", () => {
    for (const p of ["/", "/en", "/administrator", "/en/admin"]) expect(adminGateRedirect(p, [])).toBeNull();
  });
});

describe("ADMIN_EMAILS parsing", () => {
  it("trims, lowercases and drops empty entries", () => {
    expect([...adminEmails({ ADMIN_EMAILS: " A@X.com,,b@y.org , " })]).toEqual(["a@x.com", "b@y.org"]);
    expect(isAdminEmail("a@x.COM", { ADMIN_EMAILS: "A@x.com" })).toBe(true);
    expect(isAdminEmail("a@x.com.evil", { ADMIN_EMAILS: "a@x.com" })).toBe(false);
    expect(adminEmails({}).size).toBe(0);
  });
});

describe("smtpConfig / mail content", () => {
  it("is null without SMTP_HOST and fails loud on a half configuration", () => {
    expect(smtpConfig({})).toBeNull();
    expect(() => smtpConfig({ SMTP_HOST: "mail.example.com" })).toThrow("MAIL_FROM is not set");
    expect(() => smtpConfig({ SMTP_HOST: "h", MAIL_FROM: "a@b.c", SMTP_PORT: "x" })).toThrow("SMTP_PORT");
    expect(smtpConfig({ SMTP_HOST: "h", MAIL_FROM: "a@b.c" })?.port).toBe(587);
  });

  it("puts the link in text and escapes it in HTML", () => {
    const link = 'https://x.test/admin/auth/verify?token=abc&x="<y>';
    const c = loginMailContent(link);
    expect(c.text).toContain(link);
    expect(c.html).toContain("token=abc&amp;x=&quot;&lt;y>");
    expect(c.html).not.toContain('"<y>');
  });
});
