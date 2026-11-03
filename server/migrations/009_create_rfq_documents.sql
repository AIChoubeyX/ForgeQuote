CREATE TABLE IF NOT EXISTS rfq_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE RESTRICT,
  document_type TEXT NOT NULL CHECK (document_type IN ('drawing_pdf', 'part_list')),
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  version INTEGER NOT NULL CHECK (version > 0),
  replaced_document_id UUID REFERENCES rfq_documents(id),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rfq_documents_rfq_idx ON rfq_documents(rfq_id, document_type, version DESC);
