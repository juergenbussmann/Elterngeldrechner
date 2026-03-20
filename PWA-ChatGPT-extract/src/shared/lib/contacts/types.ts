export type Contact = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  relation?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  /**
   * Protected contacts are system-provided and must not be deletable.
   * Keep this optional to remain backward-compatible with existing stored data.
   */
  protected?: boolean;
};
