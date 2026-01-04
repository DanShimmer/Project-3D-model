import nodemailer from "nodemailer";

export const sendEmail = async (to: string, subject: string, text: string) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const host = process.env.EMAIL_HOST;
  const portStr = process.env.EMAIL_PORT;
  const from = process.env.EMAIL_FROM || (user ? `"Polyva 3D" <${user}>` : undefined);

  if (!user || !pass) {
    // Dev fallback: don't fail if email credentials are missing
    console.log("[DEV EMAIL] To:", to, "Subject:", subject, "Text:", text);
    return;
  }

  const port = portStr ? Number(portStr) : undefined;

  const transporter = host
    ? nodemailer.createTransport({
        host,
        port: port || 587,
        secure: port === 465, // true for 465, false for other ports
        auth: { user, pass },
      })
    : nodemailer.createTransport({
        service: "Gmail",
        auth: { user, pass },
      });

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });
};
