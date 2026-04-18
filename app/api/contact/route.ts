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
  const { name, phone, restaurant, ville, quartier } = await req.json()
  try {
    await transporter.sendMail({
      from: `TableQR <${process.env.GMAIL_USER}>`,
      to: 'lemenunumerique@gmail.com',
      subject: `🍽️ Nouveau prospect — ${restaurant} (${ville})`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px 20px">
          <div style="background:linear-gradient(135deg,#F26522,#C0392B);border-radius:16px;padding:24px;margin-bottom:24px">
            <h2 style="color:white;margin:0">🍽️ Nouveau prospect TableQR</h2>
          </div>
          <div style="background:#F9FAFB;border-radius:12px;padding:20px">
            <p style="margin:0 0 12px"><strong>👤 Nom :</strong> ${name}</p>
            <p style="margin:0 0 12px"><strong>📱 Téléphone :</strong> <a href="tel:${phone}">${phone}</a></p>
            <p style="margin:0 0 12px"><strong>🏪 Restaurant :</strong> ${restaurant}</p>
            <p style="margin:0 0 12px"><strong>📍 Ville :</strong> ${ville}</p>
            ${quartier ? `<p style="margin:0"><strong>🗺️ Quartier :</strong> ${quartier}</p>` : ''}
          </div>
          <p style="color:#9CA3AF;font-size:12px;margin-top:16px">À rappeler dans les 24h · TableQR</p>
        </div>
      `
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}