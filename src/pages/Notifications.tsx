import { useEffect, useState } from 'react';
import { Bell, CheckCircle2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/client';
import type { ApiResponse, AppNotification } from '../types/api';

export const Notifications = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<ApiResponse<AppNotification[]>>('/notifications', { params: { limit: 50 } });
      setNotifications(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load notifications.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}`, { read: true });
      setNotifications((current) => current.map((item) => (
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item
      )));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to update notification.'));
    }
  };

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <p className="eyebrow">Activity</p>
          <h1>Notifications</h1>
          <p>Sync alerts, account issues, reminders, and weekly nudges.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => void loadNotifications()}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <div className="notice error-notice">{error}</div>}

      <section className="section-card notifications-card" aria-busy={loading}>
        {loading ? (
          <div className="empty-state">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">No notifications yet.</div>
        ) : (
          <div className="notifications-list">
            {notifications.map((item) => (
              <article className={`notification-row ${item.severity} ${item.readAt ? 'read' : 'unread'}`} key={item.id}>
                <span className="notification-icon"><Bell size={18} /></span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                  <small>{item.createdAt ? format(new Date(item.createdAt), 'd MMM yyyy, h:mm a') : 'Just now'}</small>
                </div>
                <div className="notification-actions">
                  {item.actionUrl && <Link className="secondary-button" to={item.actionUrl}>Open</Link>}
                  {!item.readAt && (
                    <button className="icon-button" type="button" aria-label="Mark notification read" onClick={() => void markRead(item.id)}>
                      <CheckCircle2 size={17} />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
