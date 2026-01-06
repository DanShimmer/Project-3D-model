import nodemailer from "nodemailer";

export const sendEmail = async (to: string, subject: string, text: string) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const host = process.env.EMAIL_HOST;
  const portStr = process.env.EMAIL_PORT;
  const from = process.env.EMAIL_FROM || (user ? `"Polyva 3D" <${user}>` : undefined);

  // Check if email credentials are placeholder values (not configured)
  const isPlaceholder = !user || !pass || user.includes("your.email") || pass.includes("your_");

  if (!user || !pass || isPlaceholder) {
    // Dev fallback: don't fail if email credentials are missing or placeholder
    console.log("\n" + "=".repeat(60));
    console.log("📧 [DEV EMAIL - Email not sent - credentials not configured]");
    console.log("=".repeat(60));
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("-".repeat(60));
    console.log("Content:", text);
    console.log("=".repeat(60) + "\n");
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
  
  console.log(`✅ Email sent successfully to ${to}`);
};
