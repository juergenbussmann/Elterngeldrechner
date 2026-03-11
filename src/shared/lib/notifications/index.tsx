/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { useI18n } from '../i18n';

export type NotificationKind = 'info' | 'success' | 'error';

export type Toast = {
  id: string;
  messageKey: string;
  kind?: NotificationKind;
  params?: Record<string, string | number>;
};

interface NotificationsContextValue {
  toasts: Toast[];
  showToast: (
    messageKey: string,
    options?: {
      kind?: NotificationKind;
      params?: Record<string, string | number>;
      durationMs?: number;
    }
  ) => void;
}

const NotificationsContext = React.createContext<NotificationsContextValue | undefined>(undefined);

const DEFAULT_DURATION_MS = 4000;

const generateToastId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const timeoutsRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = React.useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));

    const timeoutId = timeoutsRef.current[toastId];
    if (timeoutId) {
      clearTimeout(timeoutId);
      delete timeoutsRef.current[toastId];
    }
  }, []);

  const showToast = React.useCallback(
    (messageKey: string, options?: { kind?: NotificationKind; params?: Record<string, string | number>; durationMs?: number }) => {
      const { kind = 'info', params, durationMs = DEFAULT_DURATION_MS } = options ?? {};
      const toastId = generateToastId();

      const nextToast: Toast = {
        id: toastId,
        messageKey,
        kind,
        params,
      };

      setToasts((prev) => [...prev, nextToast]);

      const timeoutId = setTimeout(() => {
        removeToast(toastId);
      }, durationMs);

      timeoutsRef.current[toastId] = timeoutId;
    },
    [removeToast]
  );

  // The cleanup intentionally reads the latest timeoutsRef without re-running the effect.
  /* eslint-disable react-hooks/exhaustive-deps */
  React.useEffect(() => {
    return () => {
      const activeTimeouts = timeoutsRef.current;
      Object.values(activeTimeouts).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
    };
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  const value = React.useMemo<NotificationsContextValue>(
    () => ({
      toasts,
      showToast,
    }),
    [toasts, showToast]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = (): NotificationsContextValue => {
  const context = React.useContext(NotificationsContext);

  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }

  return context;
};

const applyParams = (text: string, params?: Record<string, string | number>): string => {
  if (!params) {
    return text;
  }

  return Object.entries(params).reduce((result, [key, value]) => {
    const token = `{{${key}}}`;
    return result.split(token).join(String(value));
  }, text);
};

export const NotificationsHost: React.FC = () => {
  const { toasts } = useNotifications();
  const { t } = useI18n();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="notifications-host" aria-live="polite" role="status">
      <div className="notifications-host__list">
        {toasts.map((toast) => {
          const kind = toast.kind ?? 'info';
          const message = applyParams(t(toast.messageKey), toast.params);

          return (
            <div key={toast.id} className={`notifications-host__toast notifications-host__toast--${kind}`}>
              <span>{message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const isNotificationSupported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window;

export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
};

export const showNotification = (title: string, body: string): void => {
  if (!isNotificationSupported()) {
    console.info(`[notification] ${title}: ${body}`);
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, { body });
      return;
    } catch (error) {
      console.error('Failed to show notification', error);
    }
  }

  console.info(`[notification] ${title}: ${body}`);
};

