'use client'
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Upload, Search, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Props {
  onSelect: (url: string) => void
  onClose: () => void
  restaurantId: string
}

// Bibliothèque de plats africains/locaux via Unsplash
const FOOD_LIBRARY = [
  // Plats africains
  { url: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&q=80', label: 'Riz sauce' },
  { url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&q=80', label: 'Poulet grillé' },
  { url: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80', label: 'Poisson grillé' },
  { url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80', label: 'Pizza' },
  { url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80', label: 'Salade' },
  { url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80', label: 'Bowl légumes' },
  { url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80', label: 'Soupe' },
  { url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80', label: 'Brochettes' },
  { url: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400&q=80', label: 'Banane plantain' },
  { url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80', label: 'Pancakes' },
  { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80', label: 'Plat viande' },
  { url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80', label: 'Légumes colorés' },
  { url: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&q=80', label: 'Toast œuf' },
  { url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80', label: 'Pâtes' },
  { url: 'https://images.unsplash.com/photo-1481931098730-318b6f776db0?w=400&q=80', label: 'Fruit de mer' },
  { url: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&q=80', label: 'Riz frit' },
  // Boissons
  { url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80', label: 'Cocktail' },
  { url: 'https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=400&q=80', label: 'Jus fruits' },
  { url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80', label: 'Café' },
  { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', label: 'Smoothie' },
  // Desserts
  { url: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=80', label: 'Dessert' },
  { url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80', label: 'Gâteau' },
  { url: 'https://images.unsplash.com/photo-1551024601-bec78de77564?w=400&q=80', label: 'Glace' },
  { url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&q=80', label: 'Muffin' },
]

export default function ImagePickerModal({ onSelect, onClose, restaurantId }: Props) {
  const [tab, setTab] = useState<'library' | 'upload' | 'url'>('library')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const filtered = FOOD_LIBRARY.filter(f =>
    search === '' || f.label.toLowerCase().includes(search.toLowerCase())
  )

  async function handleUpload(file: File) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const fileName = `${restaurantId}/${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('restaurant-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })

    if (!error) {
      const { data: urlData } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(fileName)
      const url = urlData.publicUrl
      setUploadedImages(prev => [url, ...prev])
      setSelected(url)
    }
    setUploading(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  function confirm() {
    const url = tab === 'url' ? urlInput : selected
    if (url) onSelect(url)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative bg-white w-full max-w-md mx-auto rounded-t-[2rem] max-h-[92vh] flex flex-col"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="font-black text-lg text-gray-900">Photo du plat</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-2xl bg-gray-100 flex items-center justify-center">
            <X size={15} className="text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-5 pb-3 flex-shrink-0">
          {[
            { key: 'library', label: '📚 Bibliothèque' },
            { key: 'upload', label: '📷 Photo' },
            { key: 'url', label: '🔗 URL' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={tab === t.key ? { backgroundColor: '#F26522', color: '#fff' } : { backgroundColor: '#F3F4F6', color: '#6B7280' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">

          {/* BIBLIOTHÈQUE */}
          {tab === 'library' && (
            <div>
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Rechercher..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-gray-50 text-sm outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {filtered.map(item => (
                  <button key={item.url} onClick={() => setSelected(item.url)}
                    className="relative aspect-square rounded-2xl overflow-hidden border-3 transition-all"
                    style={selected === item.url ? { outline: '3px solid #F26522', outlineOffset: '2px' } : {}}>
                    <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
                    {selected === item.url && (
                      <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
                          <Check size={14} className="text-white" strokeWidth={3} />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
                      <p className="text-white text-xs font-medium truncate">{item.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* UPLOAD */}
          {tab === 'upload' && (
            <div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment"
                onChange={handleFileChange} className="hidden" />

              <div className="grid grid-cols-2 gap-3 mb-5">
                <motion.button whileTap={{ scale: 0.96 }}
                  onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute('capture'); fileRef.current.click() } }}
                  className="flex flex-col items-center gap-3 p-6 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
                    <Upload size={22} className="text-orange-500" />
                  </div>
                  <p className="font-bold text-sm text-gray-700">Galerie</p>
                  <p className="text-xs text-gray-400 text-center">Choisir depuis la galerie</p>
                </motion.button>

                <motion.button whileTap={{ scale: 0.96 }}
                  onClick={() => { if (fileRef.current) { fileRef.current.setAttribute('capture', 'environment'); fileRef.current.click() } }}
                  className="flex flex-col items-center gap-3 p-6 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                    <Camera size={22} className="text-blue-500" />
                  </div>
                  <p className="font-bold text-sm text-gray-700">Caméra</p>
                  <p className="text-xs text-gray-400 text-center">Prendre une photo</p>
                </motion.button>
              </div>

              {uploading && (
                <div className="flex items-center justify-center gap-3 py-6">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 rounded-full border-2 border-t-transparent border-orange-500" />
                  <p className="text-sm text-gray-500 font-medium">Upload en cours...</p>
                </div>
              )}

              {uploadedImages.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Photos uploadées</p>
                  <div className="grid grid-cols-3 gap-2">
                    {uploadedImages.map(url => (
                      <button key={url} onClick={() => setSelected(url)}
                        className="relative aspect-square rounded-2xl overflow-hidden"
                        style={selected === url ? { outline: '3px solid #F26522', outlineOffset: '2px' } : {}}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {selected === url && (
                          <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center">
                              <Check size={14} className="text-white" strokeWidth={3} />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* URL */}
          {tab === 'url' && (
            <div>
              <p className="text-sm text-gray-500 mb-3">Collez l&apos;URL d&apos;une image en ligne</p>
              <input type="url" placeholder="https://exemple.com/photo.jpg" value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100 mb-4" />
              {urlInput && (
                <div className="rounded-2xl overflow-hidden aspect-video bg-gray-100">
                  <img src={urlInput} alt="Preview" className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bouton confirmer */}
        <div className="px-5 pb-6 pt-2 flex-shrink-0 border-t border-gray-100">
          <motion.button whileTap={{ scale: 0.97 }} onClick={confirm}
            disabled={tab === 'library' || tab === 'upload' ? !selected : !urlInput}
            className="w-full py-4 rounded-2xl text-white font-black text-base disabled:opacity-30"
            style={{ backgroundColor: '#F26522' }}>
            Utiliser cette photo
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}