import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui/Button';
import { TextInput } from '../../shared/ui/TextInput';
import {
  attemptPlusAdminUnlockWithPassword,
  disableBegleitungPlus,
  readStoredPlusAdminPasswordHash,
  useBegleitungPlus,
} from './begleitungPlus';

const BURST_MS = 800;
const LONG_PRESS_MS = 600;

export const BegleitungPlusSettingsSection: React.FC = () => {
  const plusActive = useBegleitungPlus();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('Freischaltung');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const burstRef = useRef({ count: 0, t: 0 });
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const openUnlockDialog = useCallback(() => {
    burstRef.current = { count: 0, t: 0 };
    setPassword('');
    setError('');
    const hasHash = Boolean(readStoredPlusAdminPasswordHash());
    setDialogTitle(hasHash ? 'Freischaltung' : 'Freischaltung einrichten');
    setDialogOpen(true);
  }, []);

  const handleDividerPointerDown = useCallback(() => {
    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      openUnlockDialog();
    }, LONG_PRESS_MS);
  }, [clearLongPress, openUnlockDialog]);

  const handleDividerClick = useCallback(() => {
    const now = Date.now();
    if (now - burstRef.current.t > BURST_MS) {
      burstRef.current.count = 0;
    }
    burstRef.current.t = now;
    burstRef.current.count += 1;
    if (burstRef.current.count >= 5) {
      burstRef.current.count = 0;
      openUnlockDialog();
    }
  }, [openUnlockDialog]);

  useEffect(() => {
    return () => clearLongPress();
  }, [clearLongPress]);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setPassword('');
    setError('');
  }, []);

  const handleConfirm = useCallback(async () => {
    setError('');
    const raw = password;
    setPassword('');

    const result = await attemptPlusAdminUnlockWithPassword(raw);
    if (result === 'invalid') {
      setError('Ungültig');
      return;
    }
    handleCloseDialog();
  }, [password, handleCloseDialog]);

  return (
    <>
      <div className="settings__begleitung-plus">
        <div className="settings__begleitung-plus-title">Abo Plus</div>
        <p className="settings__begleitung-plus-status" aria-live="polite">
          Status: <strong>{plusActive ? 'Aktiv' : 'Gesperrt'}</strong>
        </p>
        {plusActive ? (
          <>
            <div className="settings-section__row">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                className="next-steps__button btn--softpill"
                onClick={() => disableBegleitungPlus()}
              >
                Abo Plus deaktivieren
              </Button>
            </div>
            <p className="settings__begleitung-plus-hint">
              Du kannst Abo Plus jederzeit wieder aktivieren.
            </p>
          </>
        ) : null}
        <div
          className="settings__begleitung-secret-divider"
          role="separator"
          aria-hidden="true"
          onClick={handleDividerClick}
          onPointerDown={handleDividerPointerDown}
          onPointerUp={clearLongPress}
          onPointerCancel={clearLongPress}
          onPointerLeave={clearLongPress}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      <Modal
        isOpen={dialogOpen}
        onClose={handleCloseDialog}
        title={dialogTitle}
        variant="softpill"
        hideFooter
      >
        <div className="begleitung-plus-unlock-dialog">
          <TextInput
            id="begleitung-plus-unlock-pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            placeholder="Passwort"
            aria-label="Passwort"
          />
          {error ? (
            <p className="begleitung-plus-unlock-dialog__error" role="status">
              {error}
            </p>
          ) : null}
          <div className="next-steps__stack begleitung-plus-unlock-dialog__actions">
            <Button
              type="button"
              variant="primary"
              fullWidth
              className="next-steps__button btn--softpill"
              onClick={() => void handleConfirm()}
            >
              Bestätigen
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              className="next-steps__button btn--softpill"
              onClick={handleCloseDialog}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
