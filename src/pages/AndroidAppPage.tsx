import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Fingerprint,
  History,
  MapPin,
  PhoneCall,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { fetchAndroidRelease, type AndroidRelease } from '../api/mobile';
import { BACKEND_URL } from '../api/client';
import { PublicFooter, PublicHeader, Reveal, usePublicMetadata } from '../components/public';

const bundledVersion = { versionName: '1.4', versionCode: 8 };

const formatReleaseDate = (value?: string) => {
  if (!value) return 'Release listing pending';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return 'Release listing pending';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
};

const releaseNoteLines = (release: AndroidRelease | null) => {
  if (!release?.releaseNotes) {
    return [
      'Lead workspace and follow-up actions',
      'Optional call intelligence on eligible plans',
      'Field shift, visit, and route-review controls',
    ];
  }
  return release.releaseNotes
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);
};

export const AndroidAppPage = () => {
  const [release, setRelease] = useState<AndroidRelease | null>(null);
  const [releaseChecked, setReleaseChecked] = useState(false);
  const configuredDownloadUrl = import.meta.env.VITE_APK_DOWNLOAD_URL?.trim() ?? '';
  const downloadUrl = configuredDownloadUrl || `${BACKEND_URL.replace(/\/$/, '')}/mobile/releases/android/download`;
  const notes = useMemo(() => releaseNoteLines(release), [release]);
  const versionName = release?.versionName ?? bundledVersion.versionName;
  const versionCode = release?.versionCode ?? bundledVersion.versionCode;

  usePublicMetadata({
    title: 'Android App | Smartly Manage',
    description: 'Download Smartly Manage for Android and review the current version, calls, leads, field shifts, permissions, data use, and APK checksum.',
    path: '/download',
  });

  useEffect(() => {
    let active = true;
    void fetchAndroidRelease().then((nextRelease) => {
      if (!active) return;
      setRelease(nextRelease);
      setReleaseChecked(true);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="lw-public lw-inner-page lw-app-page">
      <PublicHeader contextLabel="Android App" />
      <main>
        <section className="lw-store-hero">
          <div className="lw-container lw-store-shell">
            <Reveal className="lw-store-summary">
              <div className="lw-store-title-row">
                <span className="lw-store-icon"><img src="/pwa-512x512.png" alt="Smartly Manage app icon" /></span>
                <div>
                  <p className="lw-eyebrow">Android companion</p>
                  <h1>Smartly Manage</h1>
                  <a href="mailto:info@smartlymanage.com">Smartly Manage</a>
                  <small>Business · Sales productivity</small>
                </div>
              </div>
              <div className="lw-store-metadata" aria-label="Android app details">
                <div><strong>{versionName}</strong><span>Version</span></div>
                <div><strong>{versionCode}</strong><span>Build code</span></div>
                <div><strong>{formatReleaseDate(release?.publishedAt)}</strong><span>Updated</span></div>
                <div><strong>Direct APK</strong><span>Distribution</span></div>
              </div>
              <div className="lw-store-actions">
                {release ? (
                  <a className="lw-button lw-button-primary" href={downloadUrl}>
                    <Download size={19} /> Download current APK
                  </a>
                ) : (
                  <span className="lw-button lw-button-unavailable" role="status">
                    <Smartphone size={19} /> {releaseChecked ? 'Android download coming soon' : 'Checking latest release…'}
                  </span>
                )}
                <Link className="lw-text-link lw-text-link-dark" to="/privacy">
                  Data and privacy <ArrowRight size={16} />
                </Link>
              </div>
              <p className="lw-store-note"><ShieldCheck size={16} /> Only install an APK from this official release page. Android may ask you to approve installation from your browser.</p>
            </Reveal>

            <Reveal className="lw-store-phone" delay={100}>
              <span className="lw-store-phone-speaker" />
              <div className="lw-app-screen-head">
                <span className="lw-mini-brand"><img src="/smartly-manage-icon.webp" alt="" /></span>
                <div><small>Welcome back</small><strong>Today’s activity</strong></div>
                <span className="lw-app-avatar">RP</span>
              </div>
              <div className="lw-app-metric">
                <span><PhoneCall size={18} /></span>
                <div><small>Calls synced</small><strong>Ready to review</strong></div>
                <CheckCircle2 size={18} />
              </div>
              <div className="lw-app-chart" aria-hidden="true">
                <span style={{ height: '42%' }} /><span style={{ height: '68%' }} /><span style={{ height: '51%' }} />
                <span style={{ height: '84%' }} /><span style={{ height: '72%' }} /><span style={{ height: '95%' }} />
              </div>
              <div className="lw-app-list-row"><span><PhoneCall size={16} /></span><div><strong>Recent calls</strong><small>Synced from this device</small></div><ArrowRight size={15} /></div>
              <div className="lw-app-list-row"><span><MapPin size={16} /></span><div><strong>Today’s shift</strong><small>Start only when you are ready</small></div><ArrowRight size={15} /></div>
              <div className="lw-app-bottom-nav"><PhoneCall /><History /><span><MapPin /></span><UsersRound /></div>
            </Reveal>
          </div>
        </section>

        <section className="lw-section lw-app-screens-section">
          <div className="lw-container">
            <div className="lw-section-heading">
              <p className="lw-eyebrow">Inside the app</p>
              <h2>Calls, leads, shift context, and account controls in one place.</h2>
              <p>The Android companion is designed for quick daily use, with clear permission states and visible controls for every background feature.</p>
            </div>
            <div className="lw-app-screenshot-strip">
              <Reveal as="article" className="lw-app-shot lw-shot-calls">
                <div className="lw-shot-top"><span>9:41</span><strong>Call history</strong><PhoneCall size={15} /></div>
                <div className="lw-shot-stat"><small>This week</small><strong>Call activity</strong><div><span /><span /><span /><span /><span /></div></div>
                <div className="lw-shot-rows"><p><i /><span><strong>Outgoing call</strong><small>Synced · 4m 18s</small></span></p><p><i /><span><strong>Incoming call</strong><small>Synced · 2m 42s</small></span></p><p><i /><span><strong>Missed call</strong><small>Follow-up ready</small></span></p></div>
                <footer>Calls</footer>
              </Reveal>
              <Reveal as="article" className="lw-app-shot lw-shot-shift" delay={70}>
                <div className="lw-shot-top"><span>9:41</span><strong>My shift</strong><MapPin size={15} /></div>
                <div className="lw-shift-status"><span><Clock3 size={18} /></span><small>Shift status</small><strong>Start when you’re ready</strong><button type="button" tabIndex={-1}>Start shift</button></div>
                <div className="lw-visit-list"><small>Today’s visits</small><p><MapPin size={15} /><span><strong>No visits yet</strong><em>Visits appear during an active shift.</em></span></p></div>
                <footer>Shift</footer>
              </Reveal>
              <Reveal as="article" className="lw-app-shot lw-shot-settings" delay={140}>
                <div className="lw-shot-top"><span>9:41</span><strong>Readiness</strong><ShieldCheck size={15} /></div>
                <div className="lw-ready-score"><ShieldCheck size={28} /><strong>Device ready</strong><small>Permissions and sync are healthy</small></div>
                <div className="lw-ready-list"><p><CheckCircle2 /><span>Call log access</span></p><p><CheckCircle2 /><span>Notifications</span></p><p><CheckCircle2 /><span>Background sync</span></p></div>
                <footer>Settings</footer>
              </Reveal>
            </div>
          </div>
        </section>

        <Reveal as="section" className="lw-section lw-whats-new-section">
          <div className="lw-container lw-whats-new-grid">
            <div>
              <p className="lw-eyebrow"><Sparkles size={15} /> What’s new</p>
              <h2>Version {versionName}</h2>
              <p>{release ? `Published ${formatReleaseDate(release.publishedAt)}.` : 'This is the bundled app version. The downloadable release will appear here when publishing is active.'}</p>
              <ul>{notes.map((note) => <li key={note}><CheckCircle2 size={18} /> {note}</li>)}</ul>
            </div>
            <div className="lw-release-details-card">
              <div><span><CalendarDays size={18} /></span><p><small>Last updated</small><strong>{formatReleaseDate(release?.publishedAt)}</strong></p></div>
              <div><span><Smartphone size={18} /></span><p><small>Version / build</small><strong>{versionName} ({versionCode})</strong></p></div>
              <div><span><Fingerprint size={18} /></span><p><small>APK SHA-256</small><code>{release?.sha256 ?? 'Published with the downloadable release'}</code></p></div>
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="lw-section lw-app-data-section">
          <div className="lw-container">
            <div className="lw-section-heading lw-section-heading-center">
              <p className="lw-eyebrow">How the app works</p>
              <h2>Permissions are explained at the moment they matter.</h2>
              <p>Nothing should run silently. Representatives choose when to enable call tracking, optional recording processing, or a field shift.</p>
            </div>
            <div className="lw-app-data-grid">
              <article><PhoneCall size={22} /><h3>Call logs and contacts</h3><p>Eligible call metadata can sync after permission is granted. Contacts are used only on the device for caller-name display and are never uploaded.</p></article>
              <article><MapPin size={22} /><h3>Location during a shift</h3><p>Precise location is collected only during a representative-started shift after disclosure and permission, with a persistent notification while active.</p></article>
              <article><ShieldCheck size={22} /><h3>Optional recording processing</h3><p>On eligible plans, representatives can select native-dialer recordings for private transcription and call intelligence. Smartly Manage never records the call itself.</p></article>
            </div>
            <div className="lw-app-data-links">
              <Link to="/faq">Read Android FAQs <ArrowRight size={16} /></Link>
              <Link to="/privacy">Review privacy policy <ArrowRight size={16} /></Link>
              <Link to="/delete-account">Account deletion options <ArrowRight size={16} /></Link>
            </div>
          </div>
        </Reveal>
      </main>
      <PublicFooter />
    </div>
  );
};
