import { useMemo, useState } from 'react';
import { Check, Copy, MessageCircle, Send, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth';
import { buildTrackedShareUrl } from '../../utils/marketingLinks';

const configuredSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim().replace(/\/$/, '') ?? '';
const shareTitle = 'Smartly Manage — Connected sales activity';
const shareDescription = 'Connect permitted Android calls, lead follow-up, and representative-started field shifts in one role-aware workspace.';

export const PublicFooter = () => {
  const { user } = useAuth();
  const [shareStatus, setShareStatus] = useState('');
  const shareUrl = useMemo(() => {
    if (configuredSiteUrl) return `${configuredSiteUrl}/`;
    if (typeof window !== 'undefined') return `${window.location.origin}/`;
    return 'https://smartlymanage.com/';
  }, []);
  const nativeShareUrl = buildTrackedShareUrl(shareUrl, 'native_share');
  const copyLinkUrl = buildTrackedShareUrl(shareUrl, 'copy_link');
  const encodedWhatsAppShareUrl = encodeURIComponent(buildTrackedShareUrl(shareUrl, 'whatsapp'));
  const encodedLinkedInShareUrl = encodeURIComponent(buildTrackedShareUrl(shareUrl, 'linkedin'));
  const encodedShareText = encodeURIComponent(`${shareTitle} — ${shareDescription}`);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(copyLinkUrl);
      setShareStatus('Copied');
    } catch {
      setShareStatus('Copy unavailable');
    }
    window.setTimeout(() => setShareStatus(''), 1800);
  };

  const shareLandingPage = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareDescription, url: nativeShareUrl });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    await copyShareLink();
  };

  return (
    <footer className="lw-public-footer">
      <div className="lw-footer-main">
        <div className="lw-footer-intro">
          <Link className="lw-public-brand" to="/" aria-label="Smartly Manage home">
            <span className="lw-brand-mark"><img src="/smartly-manage-icon.webp" alt="" /></span>
            <span>Smartly Manage</span>
          </Link>
          <p>Calls, leads, and field activity connected for the people who sell, coach, and grow the team.</p>
          <a href="mailto:info@smartlymanage.com">info@smartlymanage.com</a>
        </div>

        <nav className="lw-footer-links" aria-label="Product links">
          <strong>Explore</strong>
          <Link to="/product">Product</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/download">Android app</Link>
          <Link to="/about">About</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/docs/integrations">API documentation</Link>
          <Link to={user ? '/dashboard' : '/login'}>{user ? 'Dashboard' : 'Sign in'}</Link>
        </nav>

        <nav className="lw-footer-links" aria-label="Legal links">
          <strong>Policies</strong>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/refund-policy">Refund Policy</Link>
          <Link to="/cancellation-policy">Cancellation Policy</Link>
          <Link to="/delete-account">Delete Account</Link>
        </nav>

        <div className="lw-footer-share">
          <strong>Share Smartly Manage</strong>
          <p>Know a team that needs a clearer view from call to follow-up?</p>
          <div className="lw-share-actions">
            <button type="button" onClick={shareLandingPage} aria-label="Share Smartly Manage">
              <Share2 size={16} /> <span>Share</span>
            </button>
            <a
              href={`https://wa.me/?text=${encodedShareText}%20${encodedWhatsAppShareUrl}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Share Smartly Manage on WhatsApp"
            >
              <MessageCircle size={16} />
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedLinkedInShareUrl}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Share Smartly Manage on LinkedIn"
            >
              <Send size={16} />
            </a>
            <button type="button" onClick={copyShareLink} aria-label="Copy Smartly Manage link">
              {shareStatus === 'Copied' ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <span className="lw-share-status" role="status" aria-live="polite">{shareStatus}</span>
        </div>
      </div>
      <div className="lw-footer-bottom">
        <span>© {new Date().getFullYear()} Smartly Manage</span>
        <span>Built for focused sales operations.</span>
      </div>
    </footer>
  );
};
