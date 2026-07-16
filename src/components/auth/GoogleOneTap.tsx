import { useEffect, useRef, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../config/firebase';

interface OneTapPromptMoment {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
  getNotDisplayedReason?: () => string;
  getSkippedReason?: () => string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            context?: 'signin' | 'signup' | 'use';
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: (momentListener?: (moment: OneTapPromptMoment) => void) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              type?: 'standard' | 'icon';
              text?: 'signin_with' | 'signup_with' | 'continue_with';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              width?: number;
            },
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const googleScriptId = 'google-identity-services';

let googleScriptPromise: Promise<void> | null = null;

const loadGoogleIdentityScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(googleScriptId) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google sign-in script failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = googleScriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google sign-in script failed to load.'));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
};

const isGoogleOneTapConfigured = () => Boolean(googleClientId);

const signInWithGoogleIdToken = async (idToken: string) => {
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
};

const googleAuthMessage = (error: unknown) => {
  if (error instanceof FirebaseError) {
    if (error.code === 'auth/account-exists-with-different-credential') {
      return 'An account already exists for this email. Sign in with your existing method first.';
    }
    if (error.code === 'auth/popup-closed-by-user') return 'Google sign-in was closed before it finished.';
    if (error.code === 'auth/unauthorized-domain') return 'This domain is not authorized for Google sign-in in Firebase.';
  }
  return error instanceof Error ? error.message : 'Google sign-in failed. Try again.';
};

interface GoogleOneTapProps {
  context?: 'signin' | 'signup' | 'use';
  buttonText?: 'signin_with' | 'signup_with' | 'continue_with';
  prompt?: boolean;
  disabled?: boolean;
  onSuccess: () => Promise<void> | void;
  onError: (message: string) => void;
}

export const GoogleOneTap = ({
  context = 'signin',
  buttonText = 'continue_with',
  prompt = true,
  disabled = false,
  onSuccess,
  onError,
}: GoogleOneTapProps) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    if (!googleClientId || disabled) return;
    let active = true;
    loadGoogleIdentityScript()
      .then(() => {
        if (active) setScriptReady(true);
      })
      .catch((error) => {
        if (active) onErrorRef.current(googleAuthMessage(error));
      });
    return () => {
      active = false;
    };
  }, [disabled]);

  useEffect(() => {
    if (!scriptReady || !googleClientId || !window.google?.accounts?.id || disabled) return;

    const handleCredential = async (response: { credential?: string }) => {
      if (!response.credential) {
        onErrorRef.current('Google did not return a credential. Try the button again.');
        return;
      }
      try {
        await signInWithGoogleIdToken(response.credential);
        await onSuccessRef.current();
      } catch (error) {
        onErrorRef.current(googleAuthMessage(error));
      }
    };

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleCredential,
      context,
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
    });

    if (buttonRef.current) {
      buttonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: buttonText,
        shape: 'rectangular',
        width: Math.min(360, buttonRef.current.clientWidth || 320),
      });
    }

    if (prompt) {
      window.google.accounts.id.prompt((moment) => {
        if (moment.isNotDisplayed?.()) {
          console.debug('[GoogleOneTap] prompt not displayed:', moment.getNotDisplayedReason?.());
        } else if (moment.isSkippedMoment?.()) {
          console.debug('[GoogleOneTap] prompt skipped:', moment.getSkippedReason?.());
        }
      });
    }

    return () => {
      window.google?.accounts?.id.cancel();
    };
  }, [buttonText, context, disabled, prompt, scriptReady]);

  if (!isGoogleOneTapConfigured()) {
    return (
      <button className="secondary-button google-auth-fallback" type="button" disabled>
        Google sign-in unavailable
      </button>
    );
  }

  return <div className="google-auth-button" ref={buttonRef} aria-busy={!scriptReady} />;
};
