import { describe, expect, it } from 'vitest';
import { buildTrackedShareUrl } from './marketingLinks';

describe('buildTrackedShareUrl', () => {
  it('adds channel-specific campaign attribution', () => {
    expect(buildTrackedShareUrl('https://smartlymanage.com/', 'whatsapp')).toBe(
      'https://smartlymanage.com/?utm_source=whatsapp&utm_medium=social&utm_campaign=website_share',
    );
    expect(buildTrackedShareUrl('https://smartlymanage.com/', 'copy_link')).toBe(
      'https://smartlymanage.com/?utm_source=copy_link&utm_medium=referral&utm_campaign=website_share',
    );
  });

  it('preserves existing query parameters and fragments', () => {
    expect(buildTrackedShareUrl('https://smartlymanage.com/?plan=pro#pricing', 'linkedin')).toBe(
      'https://smartlymanage.com/?plan=pro&utm_source=linkedin&utm_medium=social&utm_campaign=website_share#pricing',
    );
  });
});
