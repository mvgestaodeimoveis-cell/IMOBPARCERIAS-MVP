'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Convite para instalar o PWA na tela do celular.
 * - Android/Chrome: usa o evento nativo `beforeinstallprompt` (botão "Instalar").
 * - iOS/Safari: mostra as instruções (Compartilhar → "Adicionar à Tela de Início").
 * Some sozinho se o app já estiver instalado (standalone) ou se o usuário dispensar.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const [ajudaIOS, setAjudaIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    try {
      if (localStorage.getItem('imob.install_dismiss') === '1') return;
    } catch {
      /* localStorage indisponível — segue mostrando */
    }

    const ua = window.navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua)) {
      setIsIOS(true);
      setVisivel(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisivel(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function fechar() {
    setVisivel(false);
    try {
      localStorage.setItem('imob.install_dismiss', '1');
    } catch {
      /* ignora */
    }
  }

  async function acao() {
    if (isIOS) {
      if (ajudaIOS) fechar();
      else setAjudaIOS(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisivel(false);
  }

  if (!visivel) return null;

  return (
    <div className="install-prompt">
      <button type="button" className="install-fechar" aria-label="Dispensar" onClick={fechar}>
        ×
      </button>
      <div className="install-corpo">
        <span className="install-ico" aria-hidden>
          📲
        </span>
        <div>
          <strong>Instale o app na tela do celular</strong>
          {isIOS && ajudaIOS ? (
            <p>
              No Safari: toque em <strong>Compartilhar</strong> (ícone ⬆️) e depois em{' '}
              <strong>“Adicionar à Tela de Início”</strong>.
            </p>
          ) : (
            <p>Acesso rápido, sem precisar baixar da loja.</p>
          )}
          <Link href="/como-instalar" className="install-tutorial-link">
            Ver o passo a passo →
          </Link>
        </div>
      </div>
      <button type="button" className="btn btn-emerald install-cta" onClick={acao}>
        {isIOS ? (ajudaIOS ? 'Entendi' : 'Como instalar') : 'Instalar'}
      </button>
    </div>
  );
}
