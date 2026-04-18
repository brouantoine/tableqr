export default function PrivacyPage() {
  const sections = [
    { title: '1. Données collectées', content: "Restaurateurs : email, informations restaurant, commandes, statistiques. Clients : profil anonyme temporaire (genre, type visite) via fingerprint technique anonymisé. Aucune donnée nominative requise." },
    { title: '2. Anonymat clients', content: "Les clients ne créent pas de compte permanent. Sessions identifiées par fingerprint anonymisé, supprimées automatiquement à la fin de la visite." },
    { title: '3. Utilisation', content: "Données utilisées pour fournir le service et générer des statistiques agrégées pour les restaurateurs. Nous ne vendons jamais vos données à des tiers." },
    { title: '4. Conservation', content: "Sessions clients : 24h. Données restaurateurs : durée du contrat + 12 mois. Commandes : 3 ans pour obligations comptables." },
    { title: '5. Sécurité', content: "Données stockées sur Supabase, chiffrées en transit (HTTPS) et au repos. Accès contrôlé par authentification forte." },
    { title: '6. Vos droits', content: "Droit d'accès, rectification, effacement et portabilité. Contactez privacy@tableqr.com pour exercer vos droits." },
    { title: '7. Cookies', content: "Cookies de session pour authentification admin. Cookies analytiques anonymes. Aucun cookie publicitaire." },
  ]
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-5 py-16">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: '#F26522' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </div>
          <span className="font-black text-gray-900">TABLE<span style={{ color: '#F26522' }}>QR</span></span>
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Politique de Confidentialité</h1>
        <p className="text-gray-400 text-sm mb-10">Dernière mise à jour : Avril 2025</p>
        {sections.map((s, i) => (
          <div key={i} className="mb-8">
            <h2 className="text-lg font-black text-gray-900 mb-3">{s.title}</h2>
            <p className="text-gray-600 leading-relaxed">{s.content}</p>
          </div>
        ))}
        <div className="mt-12 p-5 rounded-3xl bg-gray-50 border border-gray-100">
          <p className="text-sm text-gray-500">DPO : <span className="font-bold text-gray-700">privacy@tableqr.com</span></p>
        </div>
      </div>
    </div>
  )
}
