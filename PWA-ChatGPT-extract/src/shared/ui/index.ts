/**
 * UI Entry Layer – zentrale Bausteine für die App.
 * Entwickler greifen immer zu src/shared/ui statt eigene UI zu erfinden.
 *
 * @see docs/SSOT-AppStyle.md
 * @see docs/SSOT-DoDont.md
 */

export { Card } from './Card';
export { Button } from './Button';
export { SectionHeader } from './SectionHeader';
export { TextInput } from './TextInput';
export { TextArea } from './TextArea';
export { List, ListItem } from './List';
export { Modal } from './Modal';
export { SelectionModal, SelectionField, type SelectionOption } from './SelectionModal';

export { ModulePage, ModuleSection, ModuleStack } from './ModuleLayout';
export type { ModulePageProps, ModuleSectionProps, ModuleStackProps } from './ModuleLayout';
