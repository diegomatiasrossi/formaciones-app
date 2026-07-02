import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: Number(process.env.SMTP_PORT ?? 587) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
    // SMTP_PASSWORD no se loguea en ningún lugar de este archivo ni de sus
    // llamadores. Si necesitás debuggear transporte, activá `debug: false`.
  },
})

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await transporter.sendMail({
    from: `"Crewficina" <${process.env.SMTP_USER ?? 'noreply@crewficina.com'}>`,
    to,
    subject,
    html,
  })
}
