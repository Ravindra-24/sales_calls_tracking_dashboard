import type { OrgBranding } from '../../utils/orgBranding';

const appIcon = '/smartly-manage-icon.webp';

/**
 * Sidebar brand lockup. Once an organization uploads a logo, its logo and name
 * replace the Smartly Manage mark, with a "Powered by" line underneath.
 */
export const OrgBrand = ({ branding, as: Heading = 'h2' }: { branding: OrgBranding | null; as?: 'h2' | 'strong' }) => {
  if (!branding?.logoUrl) {
    return (
      <>
        <span className="brand-mark"><img src={appIcon} alt="" /></span>
        <Heading>Smartly Manage</Heading>
      </>
    );
  }
  return (
    <>
      <span className="brand-mark org-brand-mark"><img src={branding.logoUrl} alt="" /></span>
      <span className="brand-copy">
        <Heading title={branding.name}>{branding.name}</Heading>
        <small className="brand-powered">Powered by Smartly Manage</small>
      </span>
    </>
  );
};
