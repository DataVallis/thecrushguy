import net from "node:net";

/**
 * Minimal in-process SMTP server for tests (no TLS, accepts AUTH PLAIN/LOGIN). Captures raw messages so the
 * real nodemailer transport can be exercised end to end without an external service or new dependency.
 */
export async function startSmtpCatcher(): Promise<{
  port: number;
  messages: { from: string; to: string[]; data: string; authUser?: string }[];
  close: () => Promise<void>;
}> {
  const messages: { from: string; to: string[]; data: string; authUser?: string }[] = [];
  const server = net.createServer((socket) => {
    let buffer = "";
    let inData = false;
    let data = "";
    let from = "";
    let to: string[] = [];
    let authUser: string | undefined;
    let authStep: "none" | "user" | "pass" = "none";
    const reply = (line: string) => socket.write(`${line}\r\n`);
    reply("220 catcher ESMTP");
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let idx;
      while ((idx = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (inData) {
          if (line === ".") {
            inData = false;
            messages.push({ from, to, data, authUser });
            data = "";
            reply("250 OK queued");
          } else data += (line.startsWith("..") ? line.slice(1) : line) + "\n";
          continue;
        }
        if (authStep === "user") {
          authUser = Buffer.from(line, "base64").toString();
          authStep = "pass";
          reply("334 UGFzc3dvcmQ6");
          continue;
        }
        if (authStep === "pass") {
          authStep = "none";
          reply("235 Authenticated");
          continue;
        }
        const cmd = line.toUpperCase();
        if (cmd.startsWith("EHLO")) socket.write("250-catcher\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n");
        else if (cmd.startsWith("HELO")) reply("250 catcher");
        else if (cmd.startsWith("AUTH PLAIN")) {
          authUser = Buffer.from(line.slice(11), "base64").toString().split("\0")[1];
          reply("235 Authenticated");
        } else if (cmd.startsWith("AUTH LOGIN")) {
          authStep = "user";
          reply("334 VXNlcm5hbWU6");
        } else if (cmd.startsWith("MAIL FROM:")) {
          from = line.slice(10).replace(/[<>]/g, "").split(" ")[0]!;
          to = [];
          reply("250 OK");
        } else if (cmd.startsWith("RCPT TO:")) {
          to.push(line.slice(8).replace(/[<>]/g, "").trim());
          reply("250 OK");
        } else if (cmd === "DATA") {
          inData = true;
          reply("354 End data with <CR><LF>.<CR><LF>");
        } else if (cmd === "QUIT") {
          reply("221 Bye");
          socket.end();
        } else reply("250 OK");
      }
    });
    socket.on("error", () => {});
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as net.AddressInfo).port;
  return { port, messages, close: () => new Promise((r) => server.close(() => r())) };
}
