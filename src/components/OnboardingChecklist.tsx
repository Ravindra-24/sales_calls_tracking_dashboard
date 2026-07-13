import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { api, getApiErrorMessage } from '../api/client';
import type { ApiResponse, OnboardingState } from '../types/api';

export const OnboardingChecklist = () => {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOnboarding = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<ApiResponse<OnboardingState>>('/auth/me/onboarding');
      setState(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load onboarding checklist.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOnboarding();
  }, []);

  const markDone = async (itemId: string) => {
    if (!state) return;
    try {
      const response = await api.patch<ApiResponse<OnboardingState>>('/auth/me/onboarding', {
        completedItems: { [itemId]: true },
      });
      setState(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to update checklist.'));
    }
  };

  const dismiss = async () => {
    try {
      const response = await api.patch<ApiResponse<OnboardingState>>('/auth/me/onboarding', {
        dismissed: true,
      });
      setState(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to dismiss checklist.'));
    }
  };

  if (loading) return null;
  if (!state || state.complete || state.dismissedAt) return null;

  const progress = state.totalCount > 0 ? Math.round((state.completedCount / state.totalCount) * 100) : 0;

  return (
    <section className="section-card onboarding-checklist">
      <div className="onboarding-checklist-header">
        <div>
          <p className="eyebrow">First run</p>
          <h2>Finish setup</h2>
          <p>{state.completedCount} of {state.totalCount} complete</p>
        </div>
        <button className="icon-button" type="button" aria-label="Dismiss setup checklist" onClick={() => void dismiss()}>
          <X size={17} />
        </button>
      </div>
      <div className="onboarding-progress-bar" aria-label={`${progress}% complete`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      {error && <div className="notice error-notice">{error}</div>}
      <div className="onboarding-checklist-items">
        {state.items.map((item) => (
          <div className={`onboarding-checklist-item ${item.status}`} key={item.id}>
            {item.status === 'done' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            <span>{item.label}</span>
            {item.status === 'pending' && item.source === 'manual' && (
              <button className="secondary-button" type="button" onClick={() => void markDone(item.id)}>
                Mark done
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
