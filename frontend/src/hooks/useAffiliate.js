// Hook que lê ?ref= da URL e persiste no localStorage
import { useEffect } from 'react';

export function useAffiliate() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('affiliateRef', ref);
    }
  }, []);

  return localStorage.getItem('affiliateRef') || null;
}
