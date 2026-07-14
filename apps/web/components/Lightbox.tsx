'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface LightboxProps {
  fotos: string[];
  index: number;
  onClose: () => void;
}

/**
 * Visualizador de fotos em tela cheia (mobile-first).
 * - Navega entre fotos (setas, swipe e miniaturas).
 * - Toque na foto amplia (o pinch nativo é desabilitado no app); arraste para explorar.
 * - Fecha no ×, no fundo ou com Esc.
 */
export function Lightbox({ fotos, index, onClose }: LightboxProps) {
  const [atual, setAtual] = useState(index);
  const [zoom, setZoom] = useState(false);
  const touchX = useRef<number | null>(null);

  const total = fotos.length;
  const irPara = useCallback(
    (i: number) => {
      setZoom(false);
      setAtual((i + total) % total);
    },
    [total],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') irPara(atual + 1);
      else if (e.key === 'ArrowLeft') irPara(atual - 1);
    }
    document.addEventListener('keydown', onKey);
    // Trava o scroll do fundo enquanto o visualizador está aberto.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [atual, irPara, onClose]);

  function onTouchStart(e: React.TouchEvent) {
    if (zoom) return;
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (zoom || touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 45) irPara(atual + (dx < 0 ? 1 : -1));
    touchX.current = null;
  }

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Visualizador de fotos" onClick={onClose}>
      <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
        <span className="lightbox-count">
          {atual + 1} / {total}
        </span>
        <button type="button" className="lightbox-close" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      </div>

      <div
        className={`lightbox-stage${zoom ? ' is-zoom' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={`lightbox-img${zoom ? ' is-zoom' : ''}`}
          src={fotos[atual]}
          alt={`Foto ${atual + 1} de ${total}`}
          onClick={() => setZoom((z) => !z)}
        />
      </div>

      {total > 1 && !zoom && (
        <>
          <button
            type="button"
            className="lightbox-nav lightbox-prev"
            onClick={(e) => {
              e.stopPropagation();
              irPara(atual - 1);
            }}
            aria-label="Foto anterior"
          >
            ‹
          </button>
          <button
            type="button"
            className="lightbox-nav lightbox-next"
            onClick={(e) => {
              e.stopPropagation();
              irPara(atual + 1);
            }}
            aria-label="Próxima foto"
          >
            ›
          </button>
        </>
      )}

      <p className="lightbox-hint" onClick={(e) => e.stopPropagation()}>
        {zoom ? 'Toque para reduzir · arraste para explorar' : 'Toque na foto para ampliar'}
      </p>
    </div>
  );
}
