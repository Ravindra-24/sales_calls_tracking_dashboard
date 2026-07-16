import { useMemo, useState } from 'react';
import { Check, Copy, MessageCircle, Send, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth';

const configuredSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim().replace(/\/$/, '') ?? '';
const shareTitle = 'Smartly Manage — Sales call visibility';
const shareDescription = 'Turn Android sales call metadata into a clear, role-aware view for managers and their teams.';

export const PublicFooter = () => {
  const { user } = useAuth();
  const [shareStatus, setShareStatus] = useState('');
  const shareUrl = useMemo(() => {
    if (configuredSiteUrl) return `${configuredSiteUrl}/`;
    if (typeof window !== 'undefined') return `${window.location.origin}/`;
    return 'https://smartlymanage.com/';
  }, []);
  const encodedShareUrl = encodeURIComponent(shareUrl);
  const encodedShareText = encodeURIComponent(`${shareTitle} — ${shareDescription}`);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus('Copied');
    } catch {
      setShareStatus('Copy unavailable');
    }
    window.setTimeout(() => setShareStatus(''), 1800);
  };

  const shareLandingPage = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareDescription, url: shareUrl });
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
            <span className="lw-brand-mark"><img src="/favicon.svg" alt="" /></span>
            <span>Smartly Manage</span>
          </Link>
          <p>Clear sales call visibility for the people who coach, manage, and grow the team.</p>
          <a href="mailto:info@smartlymanage.com">info@smartlymanage.com</a>
        </div>

        <nav className="lw-footer-links" aria-label="Product links">
          <strong>Explore</strong>
          <a href="/#product-tour">Product</a>
          <a href="/#pricing">Pricing</a>
          <a href="/#android">Android</a>
          <Link to="/docs/integrations">API documentation</Link>
          <Link to={user ? '/dashboard' : '/login'}>{user ? 'Dashboard' : 'Sign in'}</Link>
        </nav>

        <nav className="lw-footer-links" aria-label="Legal links">
          <strong>Policies</strong>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/refund-policy">Refund Policy</Link>
          <Link to="/cancellation-policy">Cancellation Policy</Link>
        </nav>

        <div className="lw-footer-share">
          <strong>Share Smartly Manage</strong>
          <p>Know a team that needs a clearer view of sales calls?</p>
          <div className="lw-share-actions">
            <button type="button" onClick={shareLandingPage} aria-label="Share Smartly Manage">
              <Share2 size={16} /> <span>Share</span>
            </button>
            <a
              href={`https://wa.me/?text=${encodedShareText}%20${encodedShareUrl}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Share Smartly Manage on WhatsApp"
            >
              <MessageCircle size={16} />
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedShareUrl}`}
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
