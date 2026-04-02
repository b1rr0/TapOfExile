import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS, type Lang } from '../i18n/i18n';

/**
 * Reads :lang from the URL, syncs i18next, and provides helpers.
 */
export function useLocale() {
  const { lang } = useParams<{ lang: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const currentLang: Lang = SUPPORTED_LANGS.includes(lang as Lang)
    ? (lang as Lang)
    : 'en';

  useEffect(() => {
    if (i18n.language !== currentLang) {
      i18n.changeLanguage(currentLang);
    }
    document.documentElement.lang = currentLang;
  }, [currentLang, i18n]);

  /** Build a path preserving the current language prefix. */
  function localePath(path: string): string {
    return `/${currentLang}${path.startsWith('/') ? path : '/' + path}`;
  }

  /** Switch to another language, keeping the current path. */
  function switchLang(newLang: Lang) {
    const rest = location.pathname.replace(/^\/(en|uk)/, '');
    navigate(`/${newLang}${rest || '/'}`, { replace: true });
  }

  return { lang: currentLang, t, i18n, localePath, switchLang };
}
