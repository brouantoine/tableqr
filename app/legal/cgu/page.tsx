export default function CGUPage() {
  const sections = [
    { title: '1. Objet', content: "Les présentes CGU régissent l'accès et l'utilisation de la plateforme TableQR, service SaaS permettant aux restaurateurs de digitaliser leur menu, gestion des commandes et expérience client via QR codes." },
    { title: '2. Acceptation', content: "En créant un compte ou en utilisant TableQR, vous acceptez sans réserve les présentes CGU." },
    { title: '3. Inscription', content: "Pour accéder au service, vous devez créer un compte avec une adresse email valide. Vous êtes responsable de la confidentialité de vos identifiants." },
    { title: '4. Service', content: "TableQR fournit : menus digitaux, QR codes par table, commandes temps réel, espace social client, caisse intégrée avec récapitulatif journalier." },
    { title: '5. Tarifs', content: "Les tarifs sont en FCFA, prélevés mensuellement. Annulation possible à tout moment sans pénalité. Pas de remboursement du mois en cours." },
    { title: '6. Données', content: "Les données sont traitées conformément à notre Politique de Confidentialité. Sessions anonymes conservées 24h. Données restaurateurs conservées pendant la durée du contrat + 12 mois." },
    { title: '7. Propriété intellectuelle', content: "La plateforme, son code et son design sont la propriété exclusive de TableQR. Toute reproduction non autorisée est interdite." },
    { title: '8. Responsabilité', content: "TableQR ne peut être tenu responsable des interruptions de service ou dommages indirects. Responsabilité limitée aux 3 derniers mois de paiement." },
    { title: '9. Résiliation', content: "TableQR peut suspendre un compte en cas de violation des CGU ou non-paiement, avec préavis de 48h sauf urgence." },
    { title: '10. Droit applicable', content: "CGU soumises au droit ivoirien. Litiges devant les tribunaux d'Abidjan, Côte d'Ivoire." },
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
        <h1 className="text-3xl font-black text-gray-900 mb-2">Conditions Générales d&apos;Utilisation</h1>
        <p className="text-gray-400 text-sm mb-10">Dernière mise à jour : Avril 2025</p>
        {sections.map((s, i) => (
          <div key={i} className="mb-8">
            <h2 className="text-lg font-black text-gray-900 mb-3">{s.title}</h2>
            <p className="text-gray-600 leading-relaxed">{s.content}</p>
          </div>
        ))}
        <div className="mt-12 p-5 rounded-3xl bg-gray-50 border border-gray-100">
          <p className="text-sm text-gray-500">Contact : <span className="font-bold text-gray-700">legal@tableqr.com</span></p>
        </div>
      </div>
    </div>
  )
}
