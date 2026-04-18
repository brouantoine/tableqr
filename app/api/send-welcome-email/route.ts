import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
})

export async function POST(req: NextRequest) {
  const { email, restaurantName, password, loginUrl } = await req.json()

  await transporter.sendMail({
    from: `TableQR <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Bienvenue sur TableQR — ${restaurantName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:40px 20px">
        <h1 style="color:#F26522">Bienvenue sur TableQR 🎉</h1>
        <p>Votre restaurant <strong>${restaurantName}</strong> est créé !</p>
        <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin:20px 0">
          <p style="margin:0 0 8px"><strong>Email :</strong> ${email}</p>
          <p style="margin:0 0 8px"><strong>Mot de passe :</strong> <span style="color:#F26522;font-size:18px;font-weight:bold">${password}</span></p>
          <p style="margin:0"><strong>URL :</strong> <a href="${loginUrl}">${loginUrl}</a></p>
        </div>
        <p style="color:#EF4444;font-size:12px">⚠️ Changez votre mot de passe après la première connexion.</p>
        <a href="${loginUrl}" style="display:inline-block;background:#F26522;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:10px">
          Accéder à mon dashboard →
        </a>
      </div>
    `
  })

  return NextResponse.json({ success: true })
}