'use client'
import { useEffect, useRef } from 'react'

// Convertit un emoji en URL Twemoji CDN (jsDelivr)
function getUrl(codepoint: string): string {
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${codepoint}.svg`
}

function toCodePoint(emoji: string): string {
  return [...emoji]
    .map(c => c.codePointAt(0)!.toString(16))
    .filter(cp => cp !== 'fe0f')
    .join('-')
}

// Regex pour détecter les emojis
const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu

interface Props {
  text: string
  size?: number
  className?: string
}

// Composant pour rendre du texte avec emojis Twemoji
export function TwemojiText({ text, size = 20, className = '' }: Props) {
  const parts = text.split(EMOJI_REGEX)
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (EMOJI_REGEX.test(part)) {
          EMOJI_REGEX.lastIndex = 0
          const cp = toCodePoint(part)
          return (
            <img
              key={i}
              src={getUrl(cp)}
              alt={part}
              style={{ display: 'inline', width: size, height: size, verticalAlign: 'middle', margin: '0 1px' }}
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; (e.target as HTMLElement).insertAdjacentText('afterend', part) }}
            />
          )
        }
        return part
      })}
    </span>
  )
}

// Composant pour un seul emoji
export function TwemojiIcon({ emoji, size = 24, className = '' }: { emoji: string; size?: number; className?: string }) {
  const cp = toCodePoint(emoji)
  return (
    <img
      src={getUrl(cp)}
      alt={emoji}
      width={size}
      height={size}
      className={className}
      style={{ display: 'inline-block', objectFit: 'contain' }}
      onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; (e.currentTarget as HTMLElement).insertAdjacentText('afterend', emoji) }}
    />
  )
}

export default TwemojiText
