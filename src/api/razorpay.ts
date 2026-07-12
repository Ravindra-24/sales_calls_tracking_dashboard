export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: {
    description?: string;
    reason?: string;
  };
}

interface RazorpayCheckoutOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: { color: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', callback: (response: RazorpayFailureResponse) => void) => void;
}

interface RazorpayConstructor {
  new (options: RazorpayCheckoutOptions): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let razorpayLoader: Promise<RazorpayConstructor> | null = null;

const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (razorpayLoader) return razorpayLoader;

  razorpayLoader = new Promise<RazorpayConstructor>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-leadwatch-razorpay]');
    const script = existing ?? document.createElement('script');

    const handleLoad = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error('Razorpay Checkout loaded without becoming available.'));
    };
    const handleError = () => reject(new Error('Unable to load secure checkout. Check your connection and try again.'));

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    if (!existing) {
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.dataset.leadwatchRazorpay = 'true';
      document.head.appendChild(script);
    }
  }).catch((error) => {
    razorpayLoader = null;
    throw error;
  });

  return razorpayLoader;
};

export const openRazorpaySubscriptionCheckout = async (options: {
  keyId: string;
  providerSubscriptionId: string;
  planName: string;
  customer?: { name?: string; email?: string; phone?: string };
}) => {
  const Razorpay = await loadRazorpay();

  return new Promise<RazorpaySuccessResponse>((resolve, reject) => {
    let completed = false;
    const checkout = new Razorpay({
      key: options.keyId,
      subscription_id: options.providerSubscriptionId,
      name: 'LeadWatch',
      description: `${options.planName} subscription`,
      image: '/favicon.svg',
      prefill: {
        name: options.customer?.name,
        email: options.customer?.email,
        contact: options.customer?.phone,
      },
      theme: { color: '#4f8cff' },
      handler: (response) => {
        completed = true;
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          if (!completed) reject(new Error('Checkout was closed. Your Lite access is unchanged.'));
        },
      },
    });

    checkout.on('payment.failed', (response) => {
      if (completed) return;
      completed = true;
      reject(new Error(response.error?.description || response.error?.reason || 'Payment authorization failed.'));
    });
    checkout.open();
  });
};
