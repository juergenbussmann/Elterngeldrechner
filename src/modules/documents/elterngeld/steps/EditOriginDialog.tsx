/**
 * Dialog bei Änderung von Daten, die aus der Vorbereitung stammen.
 * Erzwingt bewusste Entscheidung: Vorbereitung aktualisieren oder als Vergleich behalten.
 */

import React from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { Button } from '../../../../shared/ui/Button';

type Props = {
  isOpen: boolean;
  onUpdatePreparation: () => void;
  onKeepAsComparison: () => void;
};

export const EditOriginDialog: React.FC<Props> = ({
  isOpen,
  onUpdatePreparation,
  onKeepAsComparison,
}) => (
  <Modal
    isOpen={isOpen}
    variant="softpill"
    title="Änderung übernehmen?"
  >
    <>
      <p className="elterngeld-edit-origin-dialog__text">
        Du hast Daten aus deiner Vorbereitung geändert. Wie möchtest du fortfahren?
      </p>
      <div className="elterngeld-edit-origin-dialog__actions">
        <Button
          type="button"
          variant="primary"
          className="next-steps__button btn--softpill elterngeld-edit-origin-dialog__btn"
          onClick={onUpdatePreparation}
        >
          Vorbereitung aktualisieren
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="next-steps__button btn--softpill elterngeld-edit-origin-dialog__btn"
          onClick={onKeepAsComparison}
        >
          Als Vergleich behalten
        </Button>
      </div>
    </>
  </Modal>
);
