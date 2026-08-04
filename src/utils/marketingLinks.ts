export type ShareChannel = 'copy_link' | 'linkedin' | 'native_share' | 'whatsapp';

const shareChannelCampaign: Record<ShareChannel, { source: string; medium: string }> = {
  copy_link: { source: 'copy_link', medium: 'referral' },
  linkedin: { source: 'linkedin', medium: 'social' },
  native_share: { source: 'native_share', medium: 'referral' },
  whatsapp: { source: 'whatsapp', medium: 'social' },
};

export const buildTrackedShareUrl = (siteUrl: string, channel: ShareChannel) => {
  const url = new URL(siteUrl);
  const campaign = shareChannelCampaign[channel];

  url.searchParams.set('utm_source', campaign.source);
  url.searchParams.set('utm_medium', campaign.medium);
  url.searchParams.set('utm_campaign', 'website_share');

  return url.toString();
};
